"use client";
import { useState, useRef, useEffect, useCallback, forwardRef, KeyboardEvent } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Base64 } from 'js-base64';
import { 
  GeminiConnectionManager, 
  Message, 
  ConnectionState,
  createMessage
} from '../services/geminiTextGen';
import { parseActionFromText } from '../services/actionParser';
import { actionProcessor } from '../services/actionProcessor';
import { useTask, TaskStep, ChatMessage } from '@/context/TaskContext';
import { HumanMessage, AiMessage, TypingIndicator, EmptyState, StepMessage } from './MessageComponents';

// ========== INTERFACES ==========
interface TextWebSocket {
  sendMediaChunk: (data: string, type: string) => void;
}


interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
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
  onWebSocketReady: _onWebSocketReady
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

  // Task context for browser automation
  const { state: taskState, dispatch: taskDispatch } = useTask();

  // Create a unified message flow that combines all messages chronologically
  const createMessageFlow = () => {
    const allMessages = [
      // Regular AI chat messages - use actual timestamps
      ...messages.map(msg => ({
        type: msg.type === 'gemini' ? 'ai' : msg.type,
        text: msg.text,
        id: msg.id || `msg-${Date.now()}-${Math.random()}`,
        timestamp: msg.timestamp || new Date()
      })),
      // Task context messages (includes automation start, steps, and completion messages)
      ...taskState.chatMessages.map(taskMsg => ({
        type: taskMsg.type === 'ai' ? 'ai' : taskMsg.type === 'user' ? 'human' : taskMsg.type === 'system' ? 'step' : 'ai',
        text: taskMsg.content,
        id: taskMsg.id,
        timestamp: taskMsg.timestamp
      }))
    ];

    // Sort all messages by timestamp to ensure chronological order (older at top, newer at bottom)
    return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const allMessages = createMessageFlow();



  // ============================================================================
  // UI CALLBACK HANDLERS
  // ============================================================================

  const handleTextResponse = async (text: string) => {
    // Show typing indicator
    setIsTyping(true);
    
    // Parse action from AI response
    const parsedAction = parseActionFromText(text);
    
    // Create message with cleaned text (without action tags)
    const message = createMessage('gemini', parsedAction.cleanedText);
    setMessages(prev => [...prev, message]);
    
    // Process browser action if present
    if (parsedAction.type === 'browser' && parsedAction.command) {
      console.log('[AiChat] Processing browser action:', parsedAction.command);
      
      try {
        const result = await actionProcessor.processAction(parsedAction);
        
        if (result.success && result.taskId) {
          console.log('[AiChat] Browser action successful:', {
            taskId: result.taskId,
            sessionId: result.sessionId,
            sessionLiveUrl: result.sessionLiveUrl
          });

          // Start browser task with session information
          taskDispatch({ 
            type: 'START_TASK', 
            taskId: result.taskId,
            sessionId: result.sessionId || undefined
          });

          // Update session status if we have session info
          if (result.sessionId && result.sessionLiveUrl) {
            console.log('[AiChat] Updating session status:', {
              sessionId: result.sessionId,
              sessionLiveUrl: result.sessionLiveUrl
            });
            taskDispatch({
              type: 'CREATE_SESSION_SUCCESS',
              sessionId: result.sessionId,
              sessionLiveUrl: result.sessionLiveUrl
            });
          }
          
          // Add system message about browser action to task context
          const actionMessage: ChatMessage = {
            id: `action-${Date.now()}`,
            type: 'ai',
            content: `🔧 **Executing browser action:** ${parsedAction.command}`,
            timestamp: new Date()
          };
          taskDispatch({ type: 'ADD_CHAT_MESSAGE', message: actionMessage });
        } else if (result.error) {
          // Add error message to task context
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            type: 'ai',
            content: `❌ **Error executing browser action:** ${result.error}`,
            timestamp: new Date()
          };
          taskDispatch({ type: 'ADD_CHAT_MESSAGE', message: errorMessage });
        }
      } catch (error) {
        console.error('[AiChat] Error processing browser action:', error);
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          type: 'ai',
          content: `❌ **Error executing browser action:** ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        };
        taskDispatch({ type: 'ADD_CHAT_MESSAGE', message: errorMessage });
      }
    }
    
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

  // ============================================================================
  // SCROLL TO BOTTOM WHEN MESSAGES CHANGE
  // ============================================================================

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [allMessages]);


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
            {allMessages.length > 0 && (
              <div className="text-gray-400 text-xs lg:text-sm">
                {allMessages.length} messages
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
              {allMessages.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {allMessages.map((message, index) => {
                    // Create a unique key that combines ID and timestamp to prevent duplicates
                    const uniqueKey = `${message.id}-${message.timestamp.getTime()}-${index}`;
                    
                    switch (message.type) {
                      case 'human':
                        return <HumanMessage key={uniqueKey} text={message.text || ''} timestamp={message.timestamp} />;
                      case 'ai':
                        return <AiMessage key={uniqueKey} text={message.text || ''} timestamp={message.timestamp} />;
                      case 'step':
                        // For step messages, we need to parse the step info from the text
                        const stepText = message.text || '';
                        const stepMatch = stepText.match(/^Step (\d+): (.+)$/);
                        if (stepMatch) {
                          const stepNumber = parseInt(stepMatch[1]);
                          const stepDescription = stepMatch[2];
                          // Create a mock step object for display
                          const mockStep: TaskStep = {
                            number: stepNumber,
                            memory: '',
                            evaluationPreviousGoal: stepDescription,
                            nextGoal: stepDescription,
                            url: '',
                            actions: [],
                            screenshotUrl: ''
                          };
                          return <StepMessage key={uniqueKey} step={mockStep} stepNumber={stepNumber} timestamp={message.timestamp} />;
                        }
                        // Fallback to regular message if parsing fails
                        return <AiMessage key={uniqueKey} text={stepText} timestamp={message.timestamp} />;
                      default:
                        return null;
                    }
                  })}
                </>
              )}
              {(isTyping || isTextLoading) && (
                <TypingIndicator />
              )}
              <div ref={messagesEndRef} />
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
