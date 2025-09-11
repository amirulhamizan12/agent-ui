"use client";
import { CheckCircle } from 'lucide-react';
import { TaskStep } from '@/context/TaskContext';

// ========== MESSAGE COMPONENTS ==========

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
          {text}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-400 text-right mr-1">
        {timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

// AI Message Component
export const AiMessage = ({ text, timestamp }: MessageProps) => {
  const isActionMessage = text.includes('🔧 **Executing browser action:**') || text.includes('❌ **Error executing browser action:**');
  const isCompletionMessage = text.includes('✅ **Task Completed Successfully!**');
  const isFailureMessage = text.includes('❌ **Task Failed**') || text.includes('⏹️ **Task Stopped**');
  const hasResults = text.includes('📋 **Results:**') || text.includes('📋 **Partial Results:**');
  
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] lg:max-w-[75%]">
        <div className={`px-4 py-3 rounded-2xl rounded-bl-md shadow-lg border ${
          isActionMessage 
            ? 'bg-gradient-to-br from-orange-900/40 to-orange-800/40 border-orange-500/40 text-orange-100' 
            : isCompletionMessage
              ? 'bg-gradient-to-br from-green-900/40 to-green-800/40 border-green-500/40 text-green-100'
              : isFailureMessage
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
                    <span className="flex-1">{line.substring(2)}</span>
                  </div>
                )
              }
              // Handle bold text
              else if (line.includes('**') && line.includes(':**')) {
                const parts = line.split(/(\*\*[^*]+\*\*)/g)
                return (
                  <div key={index} className="my-1">
                    {parts.map((part, partIndex) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                          <strong key={partIndex} className="font-semibold">
                            {part.replace(/\*\*/g, '')}
                          </strong>
                        )
                      }
                      return part
                    })}
                  </div>
                )
              }
              // Regular lines
              else {
                return (
                  <div key={index} className={line.trim() === '' ? 'h-2' : 'my-1'}>
                    {line}
                  </div>
                )
              }
            })}
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
      <div className="max-w-[85%] lg:max-w-[75%]">
        <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 border-green-500/40 text-green-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-lg border">
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

// Automation Start Message Component
export const AutomationStartMessage = ({ timestamp }: { timestamp?: Date }) => (
  <div className="flex justify-start mb-4">
    <div className="max-w-[85%] lg:max-w-[75%]">
      <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-blue-500/40 text-blue-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-lg border">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
            <span className="text-lg">🚀</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Starting Automation Task</h3>
            <p className="text-xs text-blue-300">Browser automation in progress...</p>
          </div>
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-400 text-left ml-1">
        {timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

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
          {output}
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
