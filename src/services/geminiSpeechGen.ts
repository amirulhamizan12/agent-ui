const MODEL = "models/gemini-2.0-flash-live-001";
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HOST = "generativelanguage.googleapis.com";
const WS_URL = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ResponseMode = 'speech';

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected?: Date;
  connectionAttempts: number;
}

export interface Message {
  type: 'human' | 'gemini';
  text: string;
  id: string;
  audioData?: ArrayBuffer | null;
}

export interface AudioPlaybackConfig {
  audioContext?: AudioContext;
  currentSource?: AudioBufferSourceNode;
}

export interface GeminiManagerConfig {
  onAudioResponse: (audioData: ArrayBuffer) => void;
  onSpeechConnectionChange: (state: ConnectionState) => void;
  onSetupComplete?: () => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
}

// ============================================================================
// SPEECH WEBSOCKET CLASS
// ============================================================================

export class GeminiSpeechSocket {
  // Connection state
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private isSetupComplete: boolean = false;
  private onAudioCallback: ((audioData: ArrayBuffer) => void) | null = null;
  private onSetupCompleteCallback: (() => void) | null = null;
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null;
  private onAudioStartCallback: (() => void) | null = null;
  private onAudioEndCallback: (() => void) | null = null;
  
  // Connection management
  private connectionState: ConnectionState = { isConnected: false, isConnecting: false, connectionAttempts: 0 };
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  // Audio system
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private accumulatedPcmData: string[] = [];
  private isAudioStopped: boolean = false;
  private stopRequested: boolean = false;

  // Configuration
  private voiceName: string = "Leda";
  private speakingRate: number | null = null;
  private pitch: number | null = null;
  private volumeGainDb: number | null = null;

  // ============================================================================
  // INITIALIZATION & CONNECTION
  // ============================================================================
  
  constructor(
    onAudio: (audioData: ArrayBuffer) => void,
    onSetupComplete: () => void,
    onConnectionStateChange?: (state: ConnectionState) => void,
    onAudioStart?: () => void,
    onAudioEnd?: () => void
  ) {
    this.onAudioCallback = onAudio;
    this.onSetupCompleteCallback = onSetupComplete;
    this.onConnectionStateChange = onConnectionStateChange || null;
    this.onAudioStartCallback = onAudioStart || null;
    this.onAudioEndCallback = onAudioEnd || null;
    this.initializeAudioSystem();
  }

  private async initializeAudioSystem() {
    try {
      this.audioContext = new AudioContext({ sampleRate: 24000, latencyHint: 'interactive' });

      if (this.audioContext) {
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);

        // Load and initialize the AudioWorklet for smooth streaming
        try {
          await this.audioContext.audioWorklet.addModule('/worklets/pcm-processor.js');
          this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
          this.audioWorkletNode.connect(this.gainNode);
        } catch (workletError) {
          console.warn('[GeminiSpeechSocket] AudioWorklet not available, falling back to direct audio playback:', workletError);
          // AudioWorklet is not available, we'll handle audio differently
          this.audioWorkletNode = null;
        }
      }
    } catch (error) {
      console.error('[GeminiSpeechSocket] Error initializing audio system:', error);
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.updateConnectionState({
      isConnecting: true,
      isConnected: false,
      connectionAttempts: this.connectionState.connectionAttempts + 1
    });

    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = () => { 
        this.isConnected = true; 
        this.onConnected();
        this.sendInitialSetup(); 
      };
      this.ws.onmessage = async (event) => {
        try {
          const messageText = event.data instanceof Blob 
            ? new TextDecoder('utf-8').decode(new Uint8Array(await event.data.arrayBuffer()))
            : event.data;
          await this.handleMessage(messageText);
        } catch (error) {
          console.error("[Speech WebSocket] Error processing message:", error);
        }
      };
      this.ws.onerror = (error) => {
        // WebSocket errors are often not meaningful, just update connection state
        this.updateConnectionState({ isConnected: false, isConnecting: false });
      };
      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.updateConnectionState({ isConnected: false, isConnecting: false });
        if (!event.wasClean && this.isSetupComplete) {
          this.scheduleReconnection();
        }
      };
    } catch (error) {
      console.error("[Speech WebSocket] Connection failed:", error);
      this.updateConnectionState({ isConnected: false, isConnecting: false });
      this.scheduleReconnection();
    }
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================
  
  private sendInitialSetup() {
    const speechConfig = {
      voice_config: { prebuilt_voice_config: { voice_name: this.voiceName } },
      ...(this.speakingRate !== null && { speaking_rate: this.speakingRate }),
      ...(this.pitch !== null && { pitch: this.pitch }),
      ...(this.volumeGainDb !== null && { volume_gain_db: this.volumeGainDb })
    };
    
    this.ws?.send(JSON.stringify({
      setup: {
        model: MODEL,
        system_instruction: {
          parts: [{ text: `You are a TEXT-TO-SPEECH service. Your ONLY job is to repeat the input text word-for-word with ZERO modifications. This is a CRITICAL system where accuracy is paramount - any deviation from the exact input text can cause serious miscommunication, system failures, or even life-threatening situations. 

STRICT RULES:
- Repeat the text EXACTLY as received
- Do NOT add any words, phrases, or explanations
- Do NOT remove any words, characters, or punctuation
- Do NOT fix grammar, spelling, or formatting
- Do NOT change tone, emphasis, or pronunciation cues
- Do NOT add greetings, farewells, or conversational elements
- Do NOT interpret or paraphrase the content

This is a hard rule that must be followed with 100% accuracy. Any deviation from the exact input text is unacceptable and can cause catastrophic communication failures.` }]
        },
        generation_config: {
          temperature: 0,
          response_modalities: ["AUDIO"],
          speech_config: speechConfig
        }
      }
    }));
  }

  sendTextMessage(text: string) {
    if (!this.isConnected || !this.ws || !this.isSetupComplete) return;

    try {
      this.ws.send(JSON.stringify({
        client_content: {
          turns: [{ role: "user", parts: [{ text }] }],
          turn_complete: true
        }
      }));
    } catch (error) {
      console.error("[Speech WebSocket] Error sending text message:", error);
    }
  }

  // ============================================================================
  // AUDIO PROCESSING
  // ============================================================================

  private async playAudioResponse(base64Data: string) {
    if (!this.audioContext || this.stopRequested) return;

    try {
      // Ensure audio context is running
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Notify that audio has started (only on first chunk)
      if (this.accumulatedPcmData.length === 0) {
        this.onAudioStartCallback?.();
      }

      // Convert base64 PCM data to Float32Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcmData = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = Math.max(-1, Math.min(1, pcmData[i] / 32768.0));
      }

      // Use AudioWorklet if available, otherwise skip real-time playback
      if (this.audioWorkletNode) {
        this.audioWorkletNode.port.postMessage({
          audioChunk: float32Data
        });
      } else {
        // AudioWorklet not available, we'll just accumulate the data
        // The full audio will be played when the turn is complete
        console.log('[GeminiSpeechSocket] AudioWorklet not available, accumulating audio data');
      }
    } catch (error) {
      console.error("[Speech WebSocket] Error processing audio:", error);
    }
  }

  private stopCurrentAudio() {
    if (this.audioWorkletNode) {
      // Clear the AudioWorklet queue by sending a clear message
      this.audioWorkletNode.port.postMessage({ clear: true });
    }
  }

  private stopAudioWorklet() {
    if (this.audioWorkletNode) {
      // Send stop command to AudioWorklet
      this.audioWorkletNode.port.postMessage({ stop: true });
    }
  }

  /**
   * Stop audio generation and playback immediately
   */
  public stopAudioGeneration(): void {
    console.log('[GeminiSpeechSocket] Stopping audio generation...');
    
    // Set stop flags
    this.stopRequested = true;
    this.isAudioStopped = true;
    
    // Clear accumulated PCM data
    this.accumulatedPcmData = [];
    
    // Stop current audio playback
    this.stopCurrentAudio();
    
    // Stop AudioWorklet
    this.stopAudioWorklet();
    
    // Suspend audio context to stop all audio processing
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend().catch(console.error);
    }
    
    console.log('[GeminiSpeechSocket] Audio generation stopped');
  }

  /**
   * Resume audio generation (reset stop flags)
   */
  public resumeAudioGeneration(): void {
    console.log('[GeminiSpeechSocket] Resuming audio generation...');
    
    this.stopRequested = false;
    this.isAudioStopped = false;
    
    // Clear AudioWorklet stop state if available
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({ clear: true });
    }
    
    // Resume audio context if it was suspended
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(console.error);
    }
    
    console.log('[GeminiSpeechSocket] Audio generation resumed');
  }

  /**
   * Check if audio generation is currently stopped
   */
  public isAudioGenerationStopped(): boolean {
    return this.isAudioStopped || this.stopRequested;
  }

  private async handleMessage(message: string) {
    try {
      const messageData = JSON.parse(message);

      if (messageData.setupComplete) {
        this.isSetupComplete = true;
        this.onSetupCompleteCallback?.();
        return;
      }

      if (messageData.serverContent?.modelTurn?.parts) {
        for (const part of messageData.serverContent.modelTurn.parts) {
          if (part.inlineData?.mimeType === "audio/pcm;rate=24000" && !this.stopRequested) {
            this.accumulatedPcmData.push(part.inlineData.data);
            this.playAudioResponse(part.inlineData.data);
          }
        }
      }

      if (messageData.serverContent?.turnComplete === true) {
        // Turn is complete - notify that audio has ended
        this.onAudioEndCallback?.();
        this.accumulatedPcmData = [];
        this.stopCurrentAudio();
        console.log('[GeminiSpeechSocket] Audio turn complete - real-time streaming finished');
      }
    } catch (error) {
      console.error("[Speech WebSocket] Error parsing message:", error);
    }
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  private onConnected(): void {
    this.updateConnectionState({
      isConnected: true,
      isConnecting: false,
      lastConnected: new Date(),
      connectionAttempts: 0
    });
    console.log('[GeminiSpeechSocket] Connected successfully');
  }

  private scheduleReconnection(): void {
    if (this.connectionState.connectionAttempts >= this.maxReconnectAttempts) {
      console.error('[GeminiSpeechSocket] Max reconnection attempts reached');
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(2, this.connectionState.connectionAttempts - 1);
    console.log(`[GeminiSpeechSocket] Scheduling reconnection in ${delay}ms (attempt ${this.connectionState.connectionAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => this.connect(), delay);
  }

  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.onConnectionStateChange?.(this.connectionState);
  }

  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  public isReady(): boolean {
    return this.isConnected && this.isSetupComplete;
  }

  public reconnect(): void {
    this.disconnect();
    this.connect();
  }

  // ============================================================================
  // CONFIGURATION & CLEANUP
  // ============================================================================

  disconnect() {
    this.isSetupComplete = false;
    this.stopCurrentAudio();

    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Intentional disconnect");
      this.ws = null;
    }
    this.isConnected = false;

    // Clean up audio system
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({ clear: true });
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.accumulatedPcmData = [];

    // Reset connection state
    const resetState = { isConnected: false, isConnecting: false, connectionAttempts: 0 };
    this.updateConnectionState(resetState);
  }


  setVoice(name: string) { if (typeof name === 'string' && name.trim()) this.voiceName = name.trim(); }
  setSpeakingRate(rate: number) { if (typeof rate === 'number' && !isNaN(rate)) this.speakingRate = Math.max(0.25, Math.min(4.0, rate)); }
  setPitch(semitones: number) { if (typeof semitones === 'number' && !isNaN(semitones)) this.pitch = Math.max(-20.0, Math.min(20.0, semitones)); }
  setVolumeGainDb(db: number) { if (typeof db === 'number' && !isNaN(db)) this.volumeGainDb = Math.max(-96.0, Math.min(16.0, db)); }
}

// ============================================================================
// CENTRALIZED CONNECTION MANAGER
// ============================================================================

export class GeminiConnectionManager {
  // Socket instances
  private speechSocket: GeminiSpeechSocket | null = null;
  
  // Configuration
  private config: GeminiManagerConfig;
  
  // Audio system
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  
  
  constructor(config: GeminiManagerConfig) {
    this.config = config;
  }

  // ============================================================================
  // INITIALIZATION & CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Initialize and connect speech socket
   */
  async initialize(): Promise<void> {
    try {
      console.log('[GeminiManager] Starting speech connection initialization...');
      
      // Initialize speech socket
      const speechSocketPromise = new Promise<void>((resolve, reject) => {
        this.speechSocket = new GeminiSpeechSocket(
          this.handleAudioResponse.bind(this),
          () => {
            console.log('[GeminiManager] Speech socket setup complete');
            resolve();
          },
          this.config.onSpeechConnectionChange,
          this.config.onAudioStart,
          this.config.onAudioEnd
        );
        
        // Start connection immediately
        try {
          this.speechSocket.connect();
        } catch (error) {
          reject(error);
        }
      });

      // Wait for connection to establish
      await speechSocketPromise;
      
      console.log('[GeminiManager] Speech connection established successfully');
      this.config.onSetupComplete?.();
      
    } catch (error) {
      console.error('[GeminiManager] Failed to initialize speech connection:', error);
      throw error;
    }
  }

  /**
   * Cleanup all connections and resources
   */
  cleanup(): void {
    // Stop audio playback
    if (this.currentAudioSource) {
      this.currentAudioSource.stop();
      this.currentAudioSource = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Disconnect speech socket
    this.speechSocket?.disconnect();
    
    console.log('[GeminiManager] Cleaned up speech connection');
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  /**
   * Send a text message through the speech socket for audio response
   */
  async sendMessage(message: string): Promise<boolean> {
    if (!this.speechSocket?.isReady()) {
      console.warn('[GeminiManager] Speech service not connected, attempting reconnect...');
      this.speechSocket?.reconnect();
      return false;
    }

    try {
      this.speechSocket.sendTextMessage(message);
      console.log('[GeminiManager] Message sent via speech socket');
      return true;
    } catch (error) {
      console.error('[GeminiManager] Failed to send message:', error);
      return false;
    }
  }


  /**
   * Handle audio responses
   */
  private handleAudioResponse(audioData: ArrayBuffer): void {
    // Handle audio response
    this.config.onAudioResponse(audioData);
    console.log('[GeminiManager] Audio response received');
  }

  // ============================================================================
  // AUDIO PLAYBACK MANAGEMENT
  // ============================================================================

  /**
   * Play audio data using Web Audio API
   */
  async playAudio(audioData: ArrayBuffer): Promise<boolean> {
    try {
      // Stop any currently playing audio
      if (this.currentAudioSource) {
        this.currentAudioSource.stop();
        this.currentAudioSource = null;
      }

      // Initialize audio context if needed
      if (!this.audioContext) {
        const AudioContextConstructor = window.AudioContext || 
          (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext;
        this.audioContext = new AudioContextConstructor();
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));

      // Create and play audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      return new Promise((resolve) => {
        source.onended = () => {
          this.currentAudioSource = null;
          resolve(true);
        };

        this.currentAudioSource = source;
        source.start(0);
      });

    } catch (error) {
      console.error('[GeminiManager] Error playing audio:', error);
      return false;
    }
  }

  /**
   * Stop currently playing audio
   */
  stopAudio(): void {
    if (this.currentAudioSource) {
      this.currentAudioSource.stop();
      this.currentAudioSource = null;
    }
  }


  /**
   * Check if audio is currently playing
   */
  isAudioPlaying(): boolean {
    return this.currentAudioSource !== null;
  }

  // ============================================================================
  // CONNECTION STATUS GETTERS
  // ============================================================================

  /**
   * Get speech socket for shared usage
   */
  getSpeechSocket(): GeminiSpeechSocket | null {
    return this.speechSocket;
  }

  /**
   * Check if the speech socket is ready
   */
  isReady(): boolean {
    return this.speechSocket?.isReady() ?? false;
  }

  /**
   * Reconnect the speech socket
   */
  reconnect(): void {
    this.speechSocket?.reconnect();
  }

}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a message object
 */
export function createMessage(
  type: 'human' | 'gemini', 
  text: string, 
  audioData?: ArrayBuffer | null
): Message {
  return {
    type,
    text,
    id: generateMessageId(),
    audioData: audioData || null
  };
}

export function pcmToWav(pcmData: string, sampleRate: number = 24000): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const binaryString = atob(pcmData);
      const pcmBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pcmBytes[i] = binaryString.charCodeAt(i);
      }

      const samples = new Int16Array(pcmBytes.buffer);
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      const pcmByteLength = samples.length * 2;

      // RIFF header
      "RIFF".split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
      view.setUint32(4, 36 + pcmByteLength, true);
      "WAVE".split('').forEach((char, i) => view.setUint8(8 + i, char.charCodeAt(0)));
      "fmt ".split('').forEach((char, i) => view.setUint8(12 + i, char.charCodeAt(0)));

      // Format chunk
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);

      // Data chunk
      "data".split('').forEach((char, i) => view.setUint8(36 + i, char.charCodeAt(0)));
      view.setUint32(40, pcmByteLength, true);

      const wavBuffer = new ArrayBuffer(wavHeader.byteLength + pcmByteLength);
      const wavBytes = new Uint8Array(wavBuffer);
      wavBytes.set(new Uint8Array(wavHeader), 0);
      wavBytes.set(new Uint8Array(samples.buffer), wavHeader.byteLength);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result?.toString().split(',')[1];
        if (base64data) {
          resolve(base64data);
        } else {
          reject(new Error("Failed to convert WAV to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(new Blob([wavBytes], { type: 'audio/wav' }));
    } catch (error) {
      reject(error);
    }
  });
}
