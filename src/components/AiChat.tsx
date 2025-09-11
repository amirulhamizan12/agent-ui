"use client";
import { useState, useRef, useEffect, useCallback, forwardRef, KeyboardEvent } from 'react';
import { Mic, MicOff, Loader2, CheckCircle, Volume2 } from 'lucide-react';
import { Base64 } from 'js-base64';
import { 
  GeminiConnectionManager, 
  Message, 
  ConnectionState,
  createMessage
} from '../services/geminiTextGen';
import { 
  GeminiConnectionManager as SpeechConnectionManager,
  ConnectionState as SpeechConnectionState
} from '../services/geminiSpeechGen';
import { parseActionFromText } from '../services/actionParser';
import { actionProcessor } from '../services/actionProcessor';
import { useTask, TaskStep, ChatMessage } from '@/context/TaskContext';

// ========== MESSAGE COMPONENTS ==========

// Helper function to format bold text
const formatBoldText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold">
          {part.replace(/\*\*/g, '')}
        </strong>
      )
    }
    return part
  })
}

// Base Message Interface
export interface MessageProps {
  text: string;
  timestamp?: Date;
  id?: string;
}

// Human Message Component
export const HumanMessage = ({ text, timestamp }: MessageProps) => (
  <div className="flex justify-end mb-4">
    <div className="max-w-[85%] lg:max-w-[75%]">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-lg">
        <div className="text-sm leading-relaxed break-words">
          {formatBoldText(text)}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-400 text-right mr-1">
        {timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

// AI Message Component
export const AiMessage = ({ 
  text, 
  timestamp, 
  messageId, 
  isSpeaking = false, 
  onSpeak, 
  onStopSpeaking 
}: MessageProps & {
  messageId?: string;
  isSpeaking?: boolean;
  onSpeak?: (messageId: string, text: string) => void;
  onStopSpeaking?: () => void;
}) => {
  const isFailureMessage = text.includes('❌ **Task Failed**') || text.includes('⏹️ **Task Stopped**');
  const hasResults = text.includes('📋 **Results:**') || text.includes('📋 **Partial Results:**');
  
  const handleSpeakClick = () => {
    if (messageId && onSpeak) {
      onSpeak(messageId, text);
    }
  };

  const handleStopClick = () => {
    if (onStopSpeaking) {
      onStopSpeaking();
    }
  };
  
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] lg:max-w-[75%]">
        <div className={`px-4 py-3 rounded-2xl rounded-bl-md shadow-lg border ${
          isFailureMessage
            ? 'bg-gradient-to-br from-red-900/40 to-red-800/40 border-red-500/40 text-red-100'
            : hasResults
              ? 'bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-blue-500/40 text-blue-100'
              : 'bg-gradient-to-br from-dark-300 to-dark-400 text-white border-dark-200/50'
        }`}>
          <div className="text-sm leading-relaxed break-words">
            {text.split('\n').map((line, index) => {
              // Handle bullet points
              if (line.startsWith('• ')) {
                return (
                  <div key={index} className="flex items-start gap-2 my-1">
                    <div className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0"></div>
                    <span className="flex-1">
                      {formatBoldText(line.substring(2))}
                    </span>
                  </div>
                )
              }
              // Regular lines with bold formatting
              else {
                return (
                  <div key={index} className={line.trim() === '' ? 'h-2' : 'my-1'}>
                    {formatBoldText(line)}
                  </div>
                )
              }
            })}
          </div>
          
        </div>
        <div className="mt-1 text-xs text-gray-400 text-left ml-1 flex items-center gap-2">
          <span>
            {timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {messageId && onSpeak && (
            <button
              onClick={isSpeaking ? handleStopClick : handleSpeakClick}
              className={`
                text-xs font-medium transition-colors duration-200 hover:underline
                ${isSpeaking 
                  ? 'text-red-400 hover:text-red-300' 
                  : 'text-gray-400 hover:text-gray-300'
                }
              `}
              title={isSpeaking ? 'Stop speaking' : 'Speak this message'}
            >
              {isSpeaking ? 'Stop' : 'Speak'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Action Message Component
export const ActionMessage = ({ text, timestamp }: MessageProps) => {
  const isError = text.includes('❌ **Error executing browser action:**');
  const actionText = isError 
    ? text.replace('❌ **Error executing browser action:**', '').trim()
    : text.replace('🔧 **Executing browser action:**', '').trim();

  return (
    <div className="flex justify-start mb-4">
      <div className="w-full">
        <div className={`px-4 py-3 rounded-lg shadow-lg border ${
          isError
            ? 'bg-gradient-to-br from-red-900/40 to-red-800/40 border-red-500/40 text-red-100'
            : 'bg-gradient-to-br from-orange-900/40 to-orange-800/40 border-orange-500/40 text-orange-100'
        }`}>
          <div className="flex items-start gap-3">
            {/* Action Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium ${
                  isError ? 'text-red-300' : 'text-orange-300'
                }`}>
                  {isError ? 'Action Error' : 'Browser Action'}
                </span>
              </div>
              
              <p className="text-white text-sm font-medium leading-relaxed">
                {actionText}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-400 text-left ml-1">
          {timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

// Step Message Component
export const StepMessage = ({ step, stepNumber, timestamp }: { step: TaskStep; stepNumber: number; timestamp?: Date }) => {
  const getStepDescription = (step: TaskStep) => {
    return step.evaluation_previous_goal || 
           step.evaluationPreviousGoal || 
           step.next_goal || 
           step.nextGoal || 
           'Performing action'
  }

  const getDomainIcon = (url: string) => {
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname.toLowerCase()
      
      if (domain.includes('google.com')) return 'G'
      if (domain.includes('youtube.com')) return 'Y'
      if (domain.includes('github.com')) return 'GH'
      if (domain.includes('stackoverflow.com')) return 'SO'
      if (domain.includes('reddit.com')) return 'R'
      if (domain.includes('twitter.com') || domain.includes('x.com')) return 'X'
      if (domain.includes('facebook.com')) return 'F'
      if (domain.includes('linkedin.com')) return 'LI'
      
      return domain.charAt(0).toUpperCase()
    } catch {
      return 'W'
    }
  }

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return url.length > 30 ? `${url.substring(0, 30)}...` : url
    }
  }

  const stepDescription = getStepDescription(step)
  const domainIcon = getDomainIcon(step.url || '')
  const domain = formatUrl(step.url || '')

  return (
    <div className="flex justify-start mb-4">
      <div className="w-full">
        <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 border-green-500/40 text-green-100 px-4 py-3 rounded-lg shadow-lg border">
          <div className="flex items-start gap-3">
            {/* Step Number and Checkmark */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
            </div>
            
            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-green-300">Step {stepNumber}</span>
                {step.url && (
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-gray-600 rounded flex items-center justify-center text-xs font-bold text-white">
                      {domainIcon}
                    </div>
                    <span className="text-xs text-green-300">
                      {domain}
                    </span>
                  </div>
                )}
              </div>
              
              <p className="text-white text-sm font-medium leading-relaxed">
                {stepDescription}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-400 text-left ml-1">
          {timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};


// Browser Output Message Component
export const BrowserOutputMessage = ({ output, timestamp }: { output: string; timestamp?: Date }) => (
  <div className="flex justify-start mb-4">
    <div className="max-w-[85%] lg:max-w-[75%]">
      <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border-purple-500/40 text-purple-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-lg border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
            <span className="text-lg">🌐</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Browser Automation Complete</h3>
            <p className="text-xs text-purple-300">Task execution finished</p>
          </div>
        </div>
        <div className="text-sm leading-relaxed break-words">
          {formatBoldText(output)}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-400 text-left ml-1">
        {timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

// Typing Indicator Component
export const TypingIndicator = () => (
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
);

// Empty State Component
export const EmptyState = () => (
  <div className="flex justify-center items-center h-full min-h-[400px]">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">Welcome to AI Chat</h3>
      <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
        Start a conversation by typing a message or using voice input. I&apos;m here to help!
      </p>
    </div>
  </div>
);

// Legacy components for backward compatibility
export const GeminiMessage = AiMessage;
export const StepsMessage = ({ steps }: { steps: TaskStep[] }) => {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <StepMessage key={step.id || step.number || index} step={step} stepNumber={index + 1} />
      ))}
    </div>
  );
};

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
    if (sharedWebSocket) {
      sharedWebSocket.sendMediaChunk(b64Data, "audio/pcm");
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setAudioLevel(0);
      cleanupAudio();
    } else {
      const canRecord = sharedWebSocket && isWebSocketConnected;
        
      if (!canRecord) {
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
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(false);
  const [autoSpokenMessageIds, setAutoSpokenMessageIds] = useState<Set<string>>(new Set());

  // Connection state
  const [textConnection, setTextConnection] = useState<ConnectionState>({ 
    isConnected: false, 
    isConnecting: false,
    connectionAttempts: 0
  });

  const [speechConnection, setSpeechConnection] = useState<SpeechConnectionState>({ 
    isConnected: false, 
    isConnecting: false,
    connectionAttempts: 0
  });

  // Connection manager instances
  const textConnectionManagerRef = useRef<GeminiConnectionManager | null>(null);
  const speechConnectionManagerRef = useRef<SpeechConnectionManager | null>(null);

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

  const handleTextResponse = useCallback(async (text: string) => {
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

  }, [taskDispatch]);

  const handleSpeechResponse = async () => {
    console.log('[AiChat] Received speech response, playing audio...');
    
    // Stop the typing indicator immediately when audio is received
    setIsTyping(false);
    setIsTextLoading(false);
    
    // For real-time streaming, we don't need to play audio here
    // The audio is already being played in real-time by the speech socket
    console.log('[AiChat] Real-time audio streaming in progress...');
  };

  const handleAudioStart = () => {
    console.log('[AiChat] Audio streaming started');
    // Clear any pending timeout
    if ((window as unknown as { speechTimeoutId?: NodeJS.Timeout }).speechTimeoutId) {
      clearTimeout((window as unknown as { speechTimeoutId: NodeJS.Timeout }).speechTimeoutId);
      (window as unknown as { speechTimeoutId?: NodeJS.Timeout }).speechTimeoutId = undefined;
    }
    // Stop the typing indicator when audio starts
    setIsTyping(false);
    setIsTextLoading(false);
  };

  const handleAudioEnd = () => {
    console.log('[AiChat] Audio streaming ended');
    // Clear any pending timeout
    if ((window as unknown as { speechTimeoutId?: NodeJS.Timeout }).speechTimeoutId) {
      clearTimeout((window as unknown as { speechTimeoutId: NodeJS.Timeout }).speechTimeoutId);
      (window as unknown as { speechTimeoutId?: NodeJS.Timeout }).speechTimeoutId = undefined;
    }
    // Ensure loading state is reset when audio ends
    setIsTextLoading(false);
    // Reset speaking state
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  const handleSpeakMessage = useCallback(async (messageId: string, text: string) => {
    if (!speechConnectionManagerRef.current || isSpeaking) {
      console.warn('Speech not available or already speaking');
      return;
    }

    try {
      console.log('[AiChat] Speaking message:', messageId);
      setSpeakingMessageId(messageId);
      setIsSpeaking(true);
      
      // Send the text to speech AI
      const success = await speechConnectionManagerRef.current.sendMessage(text);
      if (!success) {
        console.warn('Failed to send text to speech AI');
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      }
    } catch (error) {
      console.error('[AiChat] Error speaking message:', error);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }, [isSpeaking]);

  const handleStopSpeaking = () => {
    if (speechConnectionManagerRef.current) {
      speechConnectionManagerRef.current.stopAudio();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

  const handleTextMessage = async (message: string) => {
    // Add user message to chat
    const userMessage = createMessage('human', message);
    setMessages(prev => [...prev, userMessage]);

    setIsTextLoading(true);

    // Use text connection manager
    if (!textConnectionManagerRef.current) {
      console.warn('Text connection manager not initialized');
      setIsTextLoading(false);
      return;
    }

    const success = await textConnectionManagerRef.current.sendMessage(message);
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
        // Create text connection manager
        textConnectionManagerRef.current = new GeminiConnectionManager({
          onTextResponse: handleTextResponse,
          onTextConnectionChange: setTextConnection,
          onSetupComplete: () => {
            console.log('[AiChat] Text connection manager setup complete');
          }
        });

        // Create speech connection manager
        speechConnectionManagerRef.current = new SpeechConnectionManager({
          onAudioResponse: handleSpeechResponse,
          onSpeechConnectionChange: setSpeechConnection,
          onSetupComplete: () => {
            console.log('[AiChat] Speech connection manager setup complete');
          },
          onAudioStart: handleAudioStart,
          onAudioEnd: handleAudioEnd
        });

        // Initialize both connections in parallel
        await Promise.all([
          textConnectionManagerRef.current.initialize(),
          speechConnectionManagerRef.current.initialize()
        ]);
        
        console.log('[AiChat] Both text and speech connections initialized successfully');
        
      } catch (error) {
        console.error('[AiChat] Failed to initialize connections:', error);
      }
    };

    initializeConnections();

    // Cleanup on unmount
    return () => {
      // Clear any pending speech timeout
      if ((window as unknown as { speechTimeoutId?: NodeJS.Timeout }).speechTimeoutId) {
        clearTimeout((window as unknown as { speechTimeoutId: NodeJS.Timeout }).speechTimeoutId);
        (window as unknown as { speechTimeoutId?: NodeJS.Timeout }).speechTimeoutId = undefined;
      }
      textConnectionManagerRef.current?.cleanup();
      speechConnectionManagerRef.current?.cleanup();
    };
  }, [handleTextResponse]);

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

  // Auto speech effect - trigger when new AI messages are added
  useEffect(() => {
    if (autoSpeechEnabled && !isSpeaking && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && latestMessage.type === 'gemini' && latestMessage.text && latestMessage.id) {
        // Check if this message has already been auto-spoken
        if (!autoSpokenMessageIds.has(latestMessage.id)) {
          // Use a small delay to ensure the message is rendered first
          const timeoutId = setTimeout(() => {
            // Mark this message as auto-spoken before speaking
            setAutoSpokenMessageIds(prev => {
              const newSet = new Set(prev);
              newSet.add(latestMessage.id!);
              return newSet;
            });
            handleSpeakMessage(latestMessage.id!, latestMessage.text);
          }, 500);

          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [messages, autoSpeechEnabled, isSpeaking, autoSpokenMessageIds, handleSpeakMessage]);

  // Clear auto-spoken tracking when auto speech is disabled
  useEffect(() => {
    if (!autoSpeechEnabled) {
      setAutoSpokenMessageIds(new Set());
    }
  }, [autoSpeechEnabled]);


  return (
    <div className="w-full bg-dark-100 flex flex-col h-screen overflow-hidden">
      {/* Status Bar - Moved to top */}
      <div className="px-4 lg:px-6 py-3" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-3">
            {/* Text Connection Indicator */}
            <div className="flex items-center space-x-2">
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
                Text
              </span>
            </div>

            {/* Speech Connection Indicator */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${
                  speechConnection.isConnected 
                    ? 'bg-green-500' 
                    : speechConnection.isConnecting
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                }`}></div>
                {/* Wave effect when connected */}
                {speechConnection.isConnected && (
                  <>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500/30 animate-ping"></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500/20 animate-ping" style={{animationDelay: '0.5s'}}></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500/10 animate-ping" style={{animationDelay: '1s'}}></div>
                  </>
                )}
              </div>
              <span className="text-gray-300 text-xs lg:text-sm">
                Speech
              </span>
            </div>

            {/* Overall Status */}
            <div className="text-gray-300 text-xs lg:text-sm ml-2">
              {textConnection.isConnected && speechConnection.isConnected
                ? 'Both Connected'
                : textConnection.isConnected || speechConnection.isConnected
                  ? 'Partially Connected'
                  : 'Disconnected'
              }
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Auto Speech Toggle */}
            <button
              onClick={() => setAutoSpeechEnabled(!autoSpeechEnabled)}
              className={`
                flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200
                ${autoSpeechEnabled 
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                  : 'bg-gray-600/20 text-gray-400 border border-gray-600/30 hover:bg-gray-500/20 hover:text-gray-300'
                }
              `}
              title={autoSpeechEnabled ? 'Auto speech enabled - AI messages will be spoken automatically' : 'Auto speech disabled - Click to enable'}
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-xs font-medium">
                {autoSpeechEnabled ? 'On' : 'Off'}
              </span>
            </button>

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
                        const messageText = message.text || '';
                        // Check if this is an action message
                        if (messageText.includes('🔧 **Executing browser action:**') || messageText.includes('❌ **Error executing browser action:**')) {
                          return <ActionMessage key={uniqueKey} text={messageText} timestamp={message.timestamp} />;
                        }
                        return (
                          <AiMessage 
                            key={uniqueKey} 
                            text={messageText} 
                            timestamp={message.timestamp}
                            messageId={message.id}
                            isSpeaking={speakingMessageId === message.id}
                            onSpeak={handleSpeakMessage}
                            onStopSpeaking={handleStopSpeaking}
                          />
                        );
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
                        return (
                          <AiMessage 
                            key={uniqueKey} 
                            text={stepText} 
                            timestamp={message.timestamp}
                            messageId={message.id}
                            isSpeaking={speakingMessageId === message.id}
                            onSpeak={handleSpeakMessage}
                            onStopSpeaking={handleStopSpeaking}
                          />
                        );
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
              sharedWebSocket={textConnectionManagerRef.current?.getTextSocket()}
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
