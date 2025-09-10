"use client";
import { useState, useRef, useEffect, useCallback, forwardRef, KeyboardEvent } from 'react';
import { Sparkles, Mic, MicOff, Wifi, WifiOff, Loader2, Send, Bot } from 'lucide-react';
import { Base64 } from 'js-base64';
import { 
  GeminiConnectionManager, 
  Message, 
  ConnectionState,
  createMessage
} from '../services/geminiTextGen';

// ========== INTERFACES ==========
interface TextWebSocket {
  sendMediaChunk: (data: string, type: string) => void;
}

interface AudioPreviewProps {
  sharedWebSocket?: TextWebSocket | null;
  isWebSocketConnected?: boolean;
  onWebSocketReady?: () => void;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
}

interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

interface TextInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

// ========== UI COMPONENTS ==========

// Button Component
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10',
    };

    const variantClass = variants[variant];
    const sizeClass = sizes[size];

    return (
      <button
        className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

// ConnectionStatus Component
const ConnectionStatus = ({ isConnected, isConnecting }: ConnectionStatusProps) => {
  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-400';
    if (isConnected) return 'text-green-400';
    return 'text-red-400';
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isConnecting) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isConnected) return <Wifi className="h-4 w-4" />;
    return <WifiOff className="h-4 w-4" />;
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-300 border ${isConnected ? 'border-green-500/30' : isConnecting ? 'border-yellow-500/30' : 'border-red-500/30'}`}>
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
    </div>
  );
};

// ScrollArea Component
const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 ${className}`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6'
        }}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

// TextInput Component
const TextInput = ({ onSendMessage, isLoading = false, placeholder = "Type your message..." }: TextInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      // Reset textarea height after sending
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = '28px';
        }
      }, 0);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px'; // 128px = max-h-32
    }
  };

  useEffect(() => {
    autoResize();
  }, [message]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        <h3 className="text-lg font-semibold text-white">Text Chat</h3>
      </div>
      
      <div className="flex flex-col gap-3 rounded-[22px] transition-all relative bg-dark-300 py-3 max-h-[300px] shadow-[0px_12px_32px_0px_rgba(0,0,0,0.2)] border border-dark-400">
        {/* Textarea Container */}
        <div className="pl-4 pr-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex rounded-md border-input focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto flex-1 bg-transparent p-0 pt-[1px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full placeholder:text-gray-500 text-[15px] shadow-none resize-none min-h-[28px] text-white"
            rows={1}
            style={{ height: '28px' }}
          />
        </div>
        
        {/* Bottom Controls */}
        <div className="px-3 flex gap-2 items-center justify-end">
          {/* Right Side - Send */}
          <div className="min-w-0 flex gap-2 flex-shrink items-center">
            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || isLoading}
              className="w-8 h-8 bg-dark-400 hover:bg-dark-300 disabled:bg-dark-500 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded-full transition-colors flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// AudioPreview Component
const AudioPreview = ({ sharedWebSocket, isWebSocketConnected, onWebSocketReady }: AudioPreviewProps) => {
  // ========== STATE & REFS ==========
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const setupInProgressRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAudioSetup, setIsAudioSetup] = useState(false);
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // ========== UTILITY FUNCTIONS ==========
  const cleanupAudio = useCallback(() => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const sendAudioData = (b64Data: string) => {
    if (!sharedWebSocket) return;
    sharedWebSocket.sendMediaChunk(b64Data, "audio/pcm");
  };

  // ========== MICROPHONE CONTROL ==========
  const toggleMicrophone = async () => {
    if (isRecording && stream) {
      setIsRecording(false);
      cleanupAudio();
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    } else {
      if (!sharedWebSocket || connectionStatus !== 'connected') {
        console.warn('Cannot start recording: WebSocket not connected');
        return;
      }

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, autoGainControl: true, noiseSuppression: true }
        });

        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        setStream(audioStream);
        setIsRecording(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        cleanupAudio();
      }
    }
  };

  // ========== EFFECTS ==========
  // WebSocket connection status management
  useEffect(() => {
    if (isWebSocketConnected && sharedWebSocket) {
      setConnectionStatus('connected');
      setIsWebSocketReady(true);
      onWebSocketReady?.();
    } else if (sharedWebSocket && !isWebSocketConnected) {
      setConnectionStatus('connecting');
      setIsWebSocketReady(false);
    } else {
      setConnectionStatus('disconnected');
      setIsWebSocketReady(false);
    }
  }, [isWebSocketConnected, sharedWebSocket, onWebSocketReady]);

  // Audio processing setup
  useEffect(() => {
    if (!isRecording || !stream || !audioContextRef.current || !isWebSocketReady || isAudioSetup || setupInProgressRef.current) return;

    let isActive = true;
    setupInProgressRef.current = true;

    const setupAudioProcessing = async () => {
      try {
        const ctx = audioContextRef.current;
        if (!ctx || ctx.state === 'closed' || !isActive) {
          setupInProgressRef.current = false;
          return;
        }

        if (ctx.state === 'suspended') await ctx.resume();
        await ctx.audioWorklet.addModule('/worklets/audio-processor.js');

        if (!isActive) {
          setupInProgressRef.current = false;
          return;
        }

        audioWorkletNodeRef.current = new AudioWorkletNode(ctx, 'audio-processor', {
          numberOfInputs: 1, numberOfOutputs: 1,
          processorOptions: { sampleRate: 16000, bufferSize: 4096 },
          channelCount: 1, channelCountMode: 'explicit', channelInterpretation: 'speakers'
        });

        const source = ctx.createMediaStreamSource(stream);
        audioWorkletNodeRef.current.port.onmessage = (event) => {
          if (!isActive) return;
          const { pcmData, level } = event.data;
          setAudioLevel(level);
          const b64Data = Base64.fromUint8Array(new Uint8Array(pcmData));
          sendAudioData(b64Data);
        };

        source.connect(audioWorkletNodeRef.current);
        setIsAudioSetup(true);
        setupInProgressRef.current = false;

        return () => {
          source.disconnect();
          if (audioWorkletNodeRef.current) audioWorkletNodeRef.current.disconnect();
          setIsAudioSetup(false);
        };
      } catch {
        if (isActive) {
          cleanupAudio();
          setIsAudioSetup(false);
        }
        setupInProgressRef.current = false;
      }
    };

    setupAudioProcessing();

    return () => {
      isActive = false;
      setIsAudioSetup(false);
      setupInProgressRef.current = false;
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current = null;
      }
    };
  }, [isRecording, stream, isWebSocketReady]);

  // ========== RENDER HELPERS ==========
  const getStatusText = () => {
    if (connectionStatus === 'connected') return 'Listening...';
    if (connectionStatus === 'connecting') return 'Connecting to Gemini...';
    return 'Waiting for connection...';
  };

  // ========== RENDER ==========
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-orange-400" />
        <h3 className="text-lg font-semibold text-white">Voice Chat</h3>
      </div>

      <div className="flex-1 flex flex-col space-y-4">
        {/* Audio Visualization Display */}
        <div className="flex-1 min-h-[280px] bg-dark-300 rounded-lg flex flex-col items-center justify-center border border-dark-400 relative">
          {!isRecording ? (
            <div className="text-center space-y-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg transition-transform ${
                !sharedWebSocket || connectionStatus !== 'connected' 
                  ? 'bg-dark-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer hover:scale-105'
              }`}
                   onClick={(!sharedWebSocket || connectionStatus !== 'connected') ? undefined : toggleMicrophone}>
                <Mic className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-semibold text-white">Ready to Listen</h4>
                <p className="text-gray-400 text-base">
                  {!isWebSocketConnected ? 'Establishing connection...' : 'Click the microphone to start'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-300 shadow-lg cursor-pointer hover:scale-105 ${
                audioLevel > 10 ? 'bg-gradient-to-br from-red-500 to-red-600 scale-110' : 'bg-gradient-to-br from-orange-500 to-orange-600'
              }`}
              onClick={toggleMicrophone}>
                <MicOff className="h-10 w-10 text-white" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-1">
                  {[...Array(15)].map((_, i) => (
                    <div key={i} className={`w-1 bg-orange-500 rounded-full transition-all duration-100 ${audioLevel > (i * 6.67) ? 'h-8' : 'h-3'}`} />
                  ))}
                </div>
                <p className="text-gray-400 text-base font-medium">{getStatusText()}</p>
              </div>
            </div>
          )}
          
          {/* Connection Status Overlay */}
          {isRecording && connectionStatus !== 'connected' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg backdrop-blur-sm">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto" />
                <p className="text-white font-medium text-sm">{connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Audio Level Indicator */}
      {isRecording && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span className="font-medium">Audio Level</span>
            <span className="font-semibold">{Math.round(audioLevel)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-dark-400">
            <div className="h-full rounded-full transition-all bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" 
                 style={{ width: `${audioLevel}%`, transition: 'width 100ms ease-out' }} />
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to create message components
const HumanMessage = ({ text }: { text: string }) => (
  <div className="flex items-start space-x-3 flex-row-reverse space-x-reverse">
    <div className="flex-1 min-w-0 max-w-full">
      <div 
        className="max-w-full ml-auto"
        style={{
          maxWidth: '77%',
          background: '#ed7d35',
          color: 'white',
          padding: '13px 18px',
          borderRadius: '20px 7px 20px 20px',
          fontSize: '14px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: 'none',
          lineHeight: '1.4',
          fontFamily: 'Geist, sans-serif',
          letterSpacing: '0.06em'
        }}
      >
        <div className="break-words overflow-hidden">
          {text}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-500 text-right">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

const GeminiMessage = ({ text }: { text: string }) => (
  <div className="flex items-start space-x-3">
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white text-dark-200">
      <Bot className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0 max-w-full">
      <div className="bg-dark-300 text-white mr-12 rounded-lg p-4">
        <div className="text-sm leading-relaxed break-words overflow-hidden">
          {text}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-500 text-left">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

export default function AiChat() {
  // ============================================================================
  // UI STATE MANAGEMENT
  // ============================================================================
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Connection state
  const [textConnection, setTextConnection] = useState<ConnectionState>({ 
    isConnected: false, 
    isConnecting: false,
    connectionAttempts: 0
  });

  // Connection manager instance
  const connectionManagerRef = useRef<GeminiConnectionManager | null>(null);

  // ============================================================================
  // UI CALLBACK HANDLERS
  // ============================================================================

  const handleTextResponse = (text: string) => {
    // Show typing indicator
    setIsTyping(true);
    
    // Create message with received text
    const message = createMessage('gemini', text);
    setMessages(prev => [...prev, message]);
    
    // Update UI state
    setIsTyping(false);
    setIsTextLoading(false);
  };

  const handleTextMessage = async (message: string) => {
    // Add user message to chat
    const userMessage = createMessage('human', message);
    setMessages(prev => [...prev, userMessage]);

    setIsTextLoading(true);

    // Use regular connection manager
    if (!connectionManagerRef.current) {
      console.warn('Connection manager not initialized');
      setIsTextLoading(false);
      return;
    }

    const success = await connectionManagerRef.current.sendMessage(message);
    if (!success) {
      console.warn('Failed to send message');
      setIsTextLoading(false);
    }
  };

  // ============================================================================
  // CONNECTION INITIALIZATION
  // ============================================================================

  useEffect(() => {
    const initializeConnections = async () => {
      try {
        // Create connection manager (handles text socket connection)
        connectionManagerRef.current = new GeminiConnectionManager({
          onTextResponse: handleTextResponse,
          onTextConnectionChange: setTextConnection,
          onSetupComplete: () => {
            console.log('[AiChat] Connection manager setup complete');
          }
        });

        // Initialize connections
        await connectionManagerRef.current.initialize();
        
      } catch (error) {
        console.error('[AiChat] Failed to initialize connections:', error);
      }
    };

    initializeConnections();

    // Cleanup on unmount
    return () => {
      connectionManagerRef.current?.cleanup();
    };
  }, []);


  return (
    <div className="w-full bg-dark-100 flex flex-col h-full lg:h-screen">
      {/* Header */}
      <div className="px-6 py-4" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-primary" />
            <div>
              <span className="text-white font-medium">Gemini AI Chat</span>
              <p className="text-gray-400 text-sm">
                {textConnection.isConnected 
                  ? 'Connected to Gemini - ready for conversation'
                  : textConnection.isConnecting
                    ? 'Connecting to Gemini...'
                    : 'Disconnected - establishing connection...'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ConnectionStatus
              isConnected={textConnection.isConnected}
              isConnecting={textConnection.isConnecting}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Input Section */}
          <div className="space-y-4">
            {/* Voice Input */}
            <div className="bg-dark-200 rounded-lg p-6 min-h-[400px] flex flex-col">
              <AudioPreview
                sharedWebSocket={connectionManagerRef.current?.getTextSocket()}
                isWebSocketConnected={textConnection.isConnected}
                onWebSocketReady={() => {
                  // WebSocket is ready for audio
                }}
              />
            </div>

            {/* Text Input */}
            <div className="bg-dark-200 rounded-lg p-4">
              <TextInput
                onSendMessage={handleTextMessage}
                isLoading={isTextLoading}
                placeholder="Type your message or use voice..."
              />
            </div>
          </div>

          {/* Chat Section */}
          <div className="bg-dark-200 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-dark-300 px-4 py-3 border-b border-dark-400">
              <h3 className="text-lg font-semibold text-white">
                Conversation
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Start a conversation by typing a message or using voice</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    message.type === 'human' ? (
                      <HumanMessage key={message.id || `msg-${index}`} text={message.text} />
                    ) : (
                      <GeminiMessage
                        key={message.id || `msg-${index}`}
                        text={message.text}
                      />
                    )
                  ))
                )}
                {(isTyping || isTextLoading) && (
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-300">Gemini</p>
                        <span className="text-xs text-gray-500">typing...</span>
                      </div>
                      <div className="rounded-2xl bg-dark-300 border border-dark-400 px-4 py-3 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="ml-2 font-medium">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 lg:px-6 py-3" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className={`w-2 h-2 rounded-full ${
              textConnection.isConnected 
                ? 'bg-green-500' 
                : textConnection.isConnecting
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
            }`}></div>
            <span className="text-gray-300 text-xs lg:text-sm">
              {textConnection.isConnected 
                ? 'Connected to Gemini' 
                : textConnection.isConnecting
                  ? 'Connecting...'
                  : 'Disconnected'
              }
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {messages.length > 0 && (
              <div className="text-gray-400 text-xs lg:text-sm">
                {messages.length} messages
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
