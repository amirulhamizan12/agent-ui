"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Square, Sparkles, Send } from 'lucide-react';
import { 
  GeminiConnectionManager, 
  Message, 
  ConnectionState,
  createMessage
} from '../services/geminiSpeechGen';

// ============================================================================
// UI COMPONENTS (moved from separate files)
// ============================================================================

// Button Component (from button.tsx)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variantClasses = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    };
    
    const sizeClasses = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10',
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

// ScrollArea Component (from scroll-area.tsx)
interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`overflow-auto ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

// TextInput Component (from TextInput.tsx)
interface TextInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

const TextInput: React.FC<TextInputProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  className = ""
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <div className="flex-1 relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          rows={3}
        />
        <Button
          type="submit"
          disabled={!message.trim() || isLoading}
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

// Helper function to create message components
const HumanMessage = ({ text }: { text: string }) => (
  <div className="flex gap-3 items-start">
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-800">You</p>
        <span className="text-xs text-gray-500">now</span>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-3 text-sm text-white shadow-md">
        {text}
      </div>
    </div>
  </div>
);

const GeminiMessage = ({ text, audioData, onPlayAudio, isPlaying, onStopAudio }: {
  text: string;
  audioData?: ArrayBuffer | null;
  onPlayAudio?: () => void;
  isPlaying?: boolean;
  onStopAudio?: () => void;
}) => (
  <div className="flex gap-3 items-start">
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-800">Gemini</p>
        <span className="text-xs text-gray-500">now</span>
        {audioData && onPlayAudio && (
          <div className="flex items-center gap-1">
            {isPlaying ? (
              <Button
                onClick={onStopAudio}
                size="sm"
                variant="destructive"
                className="h-6 px-2 text-xs"
              >
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={onPlayAudio}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
              >
                <Volume2 className="h-3 w-3 mr-1" />
                Play
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-800 shadow-sm">
        {text}
      </div>
    </div>
  </div>
);

export default function TTSRealtime() {
  // ============================================================================
  // UI STATE MANAGEMENT
  // ============================================================================
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isTyping] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Connection state
  const [speechConnection, setSpeechConnection] = useState<ConnectionState>({ 
    isConnected: false, 
    isConnecting: false,
    connectionAttempts: 0
  });

  // Connection manager instance
  const connectionManagerRef = useRef<GeminiConnectionManager | null>(null);


  // Keyboard shortcut for stopping audio playback (Escape key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPlayingAudio) {
        stopAudioPlayback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayingAudio]);

  // ============================================================================
  // UI CALLBACK HANDLERS
  // ============================================================================

  const handleAudioResponse = (audioData: ArrayBuffer) => {
    // Create message with audio data
    const message = createMessage('gemini', '🎵 Audio response received', audioData);
    setMessages(prev => [...prev, message]);
    setIsTextLoading(false);
    
    console.log('[TTSRealtime] Audio received');
  };

  const playAudio = async (audioData: ArrayBuffer, messageId: string) => {
    if (!connectionManagerRef.current) return;
    
    setIsPlayingAudio(true);
    setPlayingMessageId(messageId);
    const success = await connectionManagerRef.current.playAudio(audioData);
    setIsPlayingAudio(false);
    setPlayingMessageId(null);
    
    if (!success) {
      console.error('Failed to play audio');
    }
  };

  const stopAudioPlayback = () => {
    if (connectionManagerRef.current) {
      connectionManagerRef.current.stopAudio();
      setIsPlayingAudio(false);
      setPlayingMessageId(null);
    }
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
        // Create connection manager (handles speech socket connection)
        connectionManagerRef.current = new GeminiConnectionManager({
          onAudioResponse: handleAudioResponse,
          onSpeechConnectionChange: setSpeechConnection,
          onSetupComplete: () => {
            console.log('[TTSRealtime] Connection manager setup complete');
          }
        });

        // Initialize connections
        await connectionManagerRef.current.initialize();
        
      } catch (error) {
        console.error('[TTSRealtime] Failed to initialize connections:', error);
      }
    };

    initializeConnections();

    // Cleanup on unmount
    return () => {
      connectionManagerRef.current?.cleanup();
    };
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Gemini AI Audio Chat</h1>
              <div className="flex items-center gap-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
                  speechConnection.isConnected 
                    ? 'bg-green-50 border-green-200 text-green-600' 
                    : speechConnection.isConnecting
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}>
                  <div className={`h-4 w-4 ${
                    speechConnection.isConnected 
                      ? 'text-green-600' 
                      : speechConnection.isConnecting
                      ? 'text-yellow-600 animate-spin'
                      : 'text-red-600'
                  }`}>
                    {speechConnection.isConnected ? '✓' : speechConnection.isConnecting ? '⟳' : '✗'}
                  </div>
                  <span>
                    {speechConnection.isConnected 
                      ? 'Audio AI Connected' 
                      : speechConnection.isConnecting
                      ? 'Connecting to Audio AI...'
                      : 'Audio AI Disconnected'
                    }
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isPlayingAudio && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Volume2 className="h-4 w-4 animate-pulse" />
                    <span>Playing audio...</span>
                  </div>
                  <Button
                    onClick={() => {
                      if (connectionManagerRef.current) {
                        connectionManagerRef.current.stopAudio();
                        setIsPlayingAudio(false);
                      }
                    }}
                    size="sm"
                    variant="destructive"
                    className="h-8 px-3 text-xs"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Stop Playback
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Audio Mode Info */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Audio-Only Mode
              </h3>
              <p className="text-sm text-gray-600">
                This application is configured for audio-only responses. Type your message and Gemini will respond with audio that you can play back.
              </p>
            </div>

            {/* Text Input for Audio Responses */}
            <TextInput
              onSendMessage={handleTextMessage}
              isLoading={isTextLoading}
              placeholder="Type your message for audio response..."
            />
          </div>

          {/* Chat Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Audio Conversation
              </h3>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="p-6 space-y-6">
                {messages.map((message, index) => (
                  message.type === 'human' ? (
                    <HumanMessage key={message.id || `msg-${index}`} text={message.text} />
                  ) : (
                    <GeminiMessage
                      key={message.id || `msg-${index}`}
                      text={message.text}
                      audioData={message.audioData}
                      isPlaying={playingMessageId === message.id}
                      onPlayAudio={message.audioData ? () => playAudio(message.audioData!, message.id) : undefined}
                      onStopAudio={stopAudioPlayback}
                    />
                  )
                ))}
                {(isTyping || isTextLoading) && (
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">Gemini</p>
                        <span className="text-xs text-gray-500">
                          generating audio...
                        </span>
                      </div>
                      <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-500 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="ml-2 font-medium">
                            Generating audio...
                          </span>
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
    </div>
  );
}
