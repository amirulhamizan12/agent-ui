"use client";
import { useState, useRef, useEffect, useCallback, forwardRef, KeyboardEvent } from 'react';
import { Sparkles, Mic, MicOff, Wifi, WifiOff, Loader2, Bot } from 'lucide-react';
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

// Unified Input Component
const UnifiedInput = ({ 
  onSendMessage, 
  isLoading = false, 
  placeholder = "Send Message...",
  sharedWebSocket,
  isWebSocketConnected,
  onWebSocketReady
}: TextInputProps & {
  sharedWebSocket?: TextWebSocket | null;
  isWebSocketConnected?: boolean;
  onWebSocketReady?: () => void;
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      // Reset textarea height after sending
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = '24px';
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
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const cleanupAudio = useCallback(() => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const sendAudioData = (b64Data: string) => {
    if (!sharedWebSocket) return;
    sharedWebSocket.sendMediaChunk(b64Data, "audio/pcm");
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setAudioLevel(0);
      cleanupAudio();
    } else {
      if (!sharedWebSocket || !isWebSocketConnected) {
        console.warn('Cannot start recording: WebSocket not connected');
        return;
      }

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, autoGainControl: true, noiseSuppression: true }
        });

        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        streamRef.current = audioStream;
        setIsRecording(true);

        // Setup audio processing
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        await ctx.audioWorklet.addModule('/worklets/audio-processor.js');

        audioWorkletNodeRef.current = new AudioWorkletNode(ctx, 'audio-processor', {
          numberOfInputs: 1, numberOfOutputs: 1,
          processorOptions: { sampleRate: 16000, bufferSize: 4096 },
          channelCount: 1, channelCountMode: 'explicit', channelInterpretation: 'speakers'
        });

        const source = ctx.createMediaStreamSource(audioStream);
        audioWorkletNodeRef.current.port.onmessage = (event) => {
          const { pcmData, level } = event.data;
          setAudioLevel(level);
          const b64Data = Base64.fromUint8Array(new Uint8Array(pcmData));
          sendAudioData(b64Data);
        };

        source.connect(audioWorkletNodeRef.current);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        cleanupAudio();
      }
    }
  };

  useEffect(() => {
    autoResize();
  }, [message]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const hasContent = message.trim().length > 0;
  const canRecord = sharedWebSocket && isWebSocketConnected && !isLoading;

  return (
    <div className="relative group">
      {/* Main Input Container */}
      <div className={`
        relative flex items-end gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl transition-all duration-300 ease-out
        bg-gradient-to-br from-dark-200/80 to-dark-300/80 backdrop-blur-sm
        border border-dark-400/30 shadow-lg
        ${isLoading ? 'opacity-70' : ''}
        min-h-[56px] sm:min-h-[64px]
      `}>
        {/* Text Input Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full bg-transparent border-0 focus:outline-none placeholder:text-gray-400 text-white resize-none min-h-[24px] max-h-[120px] text-sm sm:text-base leading-relaxed pr-2 scrollbar-hide"
            rows={1}
            style={{ 
              height: '24px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          />
          
        </div>

        {/* Action Buttons Container */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Voice Button */}
          <button
            onClick={toggleRecording}
            disabled={!canRecord}
            className={`
              relative w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-300 ease-out flex items-center justify-center
              ${isRecording 
                ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg scale-110' 
                : canRecord 
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-lg hover:scale-105' 
                  : 'bg-dark-400 text-gray-600 cursor-not-allowed'
              }
            `}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? (
              <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
            
          </button>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!hasContent || isLoading}
            className={`
              w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-300 ease-out flex items-center justify-center
              ${hasContent && !isLoading
                ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg'
                : 'bg-dark-400 text-gray-600 cursor-not-allowed'
              }
            `}
            title={isLoading ? 'Sending...' : 'Send message'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
            ) : (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M5 12l14 0" />
                <path d="M13 18l6 -6" />
                <path d="M13 6l6 6" />
              </svg>
            )}
          </button>
        </div>

        {/* Status Indicator */}
        {isRecording && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-dark-400/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-orange-300 font-medium whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              <span className="hidden sm:inline">Listening... {Math.round(audioLevel)}%</span>
              <span className="sm:hidden">🎤 {Math.round(audioLevel)}%</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};


// Helper function to create message components
const HumanMessage = ({ text }: { text: string }) => (
  <div className="flex justify-end mb-4">
    <div className="max-w-[85%] lg:max-w-[75%]">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-lg">
        <div className="text-sm leading-relaxed break-words">
          {text}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-400 text-right mr-1">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

const GeminiMessage = ({ text }: { text: string }) => (
  <div className="flex justify-start mb-4">
    <div className="max-w-[85%] lg:max-w-[75%]">
      <div className="bg-gradient-to-br from-dark-300 to-dark-400 text-white px-4 py-3 rounded-2xl rounded-bl-md shadow-lg border border-dark-200/50">
        <div className="text-sm leading-relaxed break-words">
          {text}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-400 text-left ml-1">
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
    <div className="w-full bg-dark-100 flex flex-col h-screen overflow-hidden">
      {/* Status Bar - Moved to top */}
      <div className="px-4 lg:px-6 py-3" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className="relative">
              <div className={`w-2 h-2 rounded-full ${
                textConnection.isConnected 
                  ? 'bg-green-500' 
                  : textConnection.isConnecting
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}></div>
              {/* Wave effect when connected */}
              {textConnection.isConnected && (
                <>
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500/30 animate-ping"></div>
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500/20 animate-ping" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500/10 animate-ping" style={{animationDelay: '1s'}}></div>
                </>
              )}
            </div>
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

      {/* Main Content - Conversation below status bar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Section - Takes most of the space with independent scrolling */}
        <div className="flex-1 bg-dark-100 mx-4 mt-4 mb-4 rounded-lg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <div className="p-4 space-y-4 min-h-full">
              {messages.length === 0 ? (
                <div className="flex justify-center items-center h-full min-h-[400px]">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center">
                      <Bot className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Welcome to AI Chat</h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                      Start a conversation by typing a message or using voice input. I'm here to help!
                    </p>
                  </div>
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
                <div className="flex justify-start mb-4">
                  <div className="max-w-[85%] lg:max-w-[75%]">
                    <div className="bg-gradient-to-br from-dark-300 to-dark-400 text-white px-4 py-3 rounded-2xl rounded-bl-md shadow-lg border border-dark-200/50">
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-gray-300 font-medium">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input Section - Fixed at bottom */}
        <div className="px-4 pb-4">
          {/* Unified Input Container */}
          <div className="max-w-4xl mx-auto">
            <UnifiedInput
              onSendMessage={handleTextMessage}
              isLoading={isTextLoading}
              placeholder="Send Message..."
              sharedWebSocket={connectionManagerRef.current?.getTextSocket()}
              isWebSocketConnected={textConnection.isConnected}
              onWebSocketReady={() => {
                // WebSocket is ready for audio
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
