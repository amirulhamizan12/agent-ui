// Constants
const MODEL = "models/gemini-2.0-flash-live-001";
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HOST = "generativelanguage.googleapis.com";
const WS_URL = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ResponseMode = 'text';

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
  timestamp?: Date;
}

export interface GeminiManagerConfig {
  onTextResponse: (text: string) => void;
  onTextConnectionChange: (state: ConnectionState) => void;
  onSetupComplete?: () => void;
}

// ============================================================================
// GEMINI TEXT SOCKET
// ============================================================================

export class GeminiTextSocket {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private isSetupComplete = false;
  private onMessageCallback: ((text: string) => void) | null = null;
  private onSetupCompleteCallback: (() => void) | null = null;
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null;
  private connectionState: ConnectionState = { isConnected: false, isConnecting: false, connectionAttempts: 0 };
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // ============================================================================
  // INITIALIZATION & CONNECTION
  // ============================================================================

  constructor(
    onMessage: (text: string) => void,
    onSetupComplete: () => void,
    onConnectionStateChange?: (state: ConnectionState) => void
  ) {
    this.onMessageCallback = onMessage;
    this.onSetupCompleteCallback = onSetupComplete;
    this.onConnectionStateChange = onConnectionStateChange || null;
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
          console.error("[WebSocket] Error processing message:", error);
        }
      };
      this.ws.onerror = (error) => {
        // Suppress initial connection errors as they're often harmless
        // Only log errors after multiple connection attempts
        if (this.connectionState.connectionAttempts > 2) {
          console.warn("[WebSocket] Persistent connection error:", error);
        }
        this.updateConnectionState({ isConnected: false, isConnecting: false });
      };
      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.updateConnectionState({ isConnected: false, isConnecting: false });
        if (!event.wasClean && this.isSetupComplete) this.scheduleReconnection();
      };
    } catch (error) {
      console.error("[WebSocket] Connection failed:", error);
      this.updateConnectionState({ isConnected: false, isConnecting: false });
      this.scheduleReconnection();
    }
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private sendInitialSetup() {
    this.ws?.send(JSON.stringify({
      setup: {
        model: MODEL,
        system_instruction: {
          parts: [{
            text: `# AI VOICE AGENT

## CORE IDENTITY
Intelligent AI voice assistant for natural conversation and web automation. Help users through spoken dialogue while executing browser tasks.

## VOICE RULES
- Natural, conversational responses for voice chat
- Concise, digestible when spoken
- Friendly, helpful, professional tone
- **ENGLISH ONLY**: Always respond in English regardless of user's language

## BROWSER AUTOMATION
Access to browser agent for: navigation, searches, clicks, forms, data extraction, screenshots, logins, web tools.

## RESPONSE FORMAT
Web tasks: "[Natural response] <action>browser("[specific instruction]")</action>"
No web: "<action>browser("idle")</action>"

Examples:
- "I'll search for that <action>browser("go to google.com and search for 'apple'")</action>"
- "Let me check Gmail <action>browser("navigate to gmail.com and open inbox")</action>"
- "I'm doing well, thanks! <action>browser("idle")</action>"

## BROWSER INSTRUCTIONS
- Specific, clear actions
- Include exact URLs when possible
- Quote search terms
- Natural language for browser agent

Good: "go to youtube.com and search for 'cat videos'"
Bad: "do some stuff on the internet"

## FLOW
1. Listen carefully
2. Determine if browser needed
3. Provide natural response + browser command
4. Wait for results if applicable
5. Follow up appropriately

## ERROR HANDLING
- Acknowledge problems naturally
- Offer alternatives
- Ask for clarification

## SECURITY
- Never ask for passwords verbally
- Guide users to login themselves
- Be transparent about actions
- Respect privacy

## REMEMBER
- EVERY response MUST include <action>browser("...")</action>
- Natural voice interface
- Actions happen silently
- Keep conversation flowing
- Focus on solving user needs`
          }]
        },
        generation_config: { response_modalities: ["TEXT"] }
      }
    }));
  }

  sendMediaChunk(b64Data: string, mimeType: string) {
    if (!this.isConnected || !this.ws || !this.isSetupComplete) return;
    try {
      this.ws.send(JSON.stringify({
        realtime_input: {
          media_chunks: [{ mime_type: mimeType === "audio/pcm" ? "audio/pcm" : mimeType, data: b64Data }]
        }
      }));
    } catch (error) {
      console.error("[WebSocket] Error sending media chunk:", error);
    }
  }

  sendTextMessage(text: string) {
    if (!this.isConnected || !this.ws || !this.isSetupComplete) return;
    try {
      this.ws.send(JSON.stringify({
        client_content: { turns: [{ role: "user", parts: [{ text }] }], turn_complete: true }
      }));
    } catch (error) {
      console.error("[WebSocket] Error sending text message:", error);
    }
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
        const textParts = messageData.serverContent.modelTurn.parts
          .filter((part: { text?: string }) => part.text)
          .map((part: { text: string }) => part.text);
        if (textParts.length > 0) {
          const fullText = textParts.join('');
          console.log('[Gemini] Raw response:', fullText);
          this.onMessageCallback?.(fullText);
        }
      }
    } catch (error) {
      console.error("[WebSocket] Error parsing message:", error);
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
    console.log('[GeminiTextSocket] Connected successfully');
  }

  private scheduleReconnection(): void {
    if (this.connectionState.connectionAttempts >= this.maxReconnectAttempts) {
      console.error('[GeminiTextSocket] Max reconnection attempts reached');
      return;
    }
    const delay = this.reconnectDelay * Math.pow(2, this.connectionState.connectionAttempts - 1);
    console.log(`[GeminiTextSocket] Scheduling reconnection in ${delay}ms (attempt ${this.connectionState.connectionAttempts})`);
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

  disconnect() {
    this.isSetupComplete = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Intentional disconnect");
      this.ws = null;
    }
    this.isConnected = false;
    this.updateConnectionState({ isConnected: false, isConnecting: false, connectionAttempts: 0 });
  }
}

// ============================================================================
// CONNECTION MANAGER
// ============================================================================

export class GeminiConnectionManager {
  private textSocket: GeminiTextSocket | null = null;
  private config: GeminiManagerConfig;
  private textAccumulator = '';
  private responseTimeout: NodeJS.Timeout | null = null;

  constructor(config: GeminiManagerConfig) {
    this.config = config;
  }

  // ============================================================================
  // INITIALIZATION & CONNECTION MANAGEMENT
  // ============================================================================

  async initialize(): Promise<void> {
    try {
      console.log('[GeminiManager] Starting text connection initialization...');
      const textSocketPromise = new Promise<void>((resolve, reject) => {
        this.textSocket = new GeminiTextSocket(
          this.handleTextResponse.bind(this),
          () => {
            console.log('[GeminiManager] Text socket setup complete');
            resolve();
          },
          this.config.onTextConnectionChange
        );
        try {
          this.textSocket.connect();
        } catch (error) {
          reject(error);
        }
      });
      await textSocketPromise;
      console.log('[GeminiManager] Text connection established successfully');
      this.config.onSetupComplete?.();
    } catch (error) {
      console.error('[GeminiManager] Failed to initialize connection:', error);
      throw error;
    }
  }

  cleanup(): void {
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }
    this.textSocket?.disconnect();
    console.log('[GeminiManager] Cleaned up all connections');
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  async sendMessage(message: string): Promise<boolean> {
    if (!this.textSocket?.isReady()) {
      console.warn('[GeminiManager] Text service not connected, attempting reconnect...');
      this.textSocket?.reconnect();
      return false;
    }
    try {
      this.textSocket.sendTextMessage(message);
      console.log('[GeminiManager] Message sent via text socket');
      return true;
    } catch (error) {
      console.error('[GeminiManager] Failed to send message:', error);
      return false;
    }
  }

  private handleTextResponse(text: string): void {
    this.textAccumulator += text;
    if (this.responseTimeout) clearTimeout(this.responseTimeout);
    this.responseTimeout = setTimeout(() => {
      if (this.textAccumulator.trim()) {
        const finalText = this.textAccumulator.trim();
        this.config.onTextResponse(finalText);
        this.textAccumulator = '';
      }
      this.responseTimeout = null;
    }, 100);
  }

  // ============================================================================
  // CONNECTION STATUS GETTERS
  // ============================================================================

  getTextSocket(): GeminiTextSocket | null {
    return this.textSocket;
  }

  isReady(): boolean {
    return this.textSocket?.isReady() ?? false;
  }

  reconnect(): void {
    this.textSocket?.reconnect();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createMessage(type: 'human' | 'gemini', text: string): Message {
  return { type, text, id: generateMessageId(), timestamp: new Date() };
}
