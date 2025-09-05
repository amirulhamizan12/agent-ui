'use client'

import { ChatMessage as ChatMessageType } from '@/context/TaskContext'
import { Bot, User, Clock, Play } from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessageComponent({ message }: ChatMessageProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMessageIcon = () => {
    // Check if this is a step message
    const isStepMessage = message.content.includes('**Step') && message.type === 'ai'
    
    switch (message.type) {
      case 'user':
        return <User className="w-5 h-5" />
      case 'ai':
        return isStepMessage ? <Play className="w-5 h-5" /> : <Bot className="w-5 h-5" />
      case 'system':
        return <Clock className="w-5 h-5" />
      default:
        return <Bot className="w-5 h-5" />
    }
  }

  const getMessageStyles = () => {
    // Check if this is a step message
    const isStepMessage = message.content.includes('**Step') && message.type === 'ai'
    
    switch (message.type) {
      case 'user':
        return 'text-white'
      case 'ai':
        return isStepMessage 
          ? 'bg-orange-900/30 border border-orange-500/30 text-white mr-12' 
          : 'bg-dark-300 text-white mr-12'
      case 'system':
        return 'bg-dark-400 text-gray-300 mx-8 text-center'
      default:
        return 'bg-dark-300 text-white mr-12'
    }
  }

  const getAvatarStyles = () => {
    // Check if this is a step message
    const isStepMessage = message.content.includes('**Step') && message.type === 'ai'
    
    switch (message.type) {
      case 'user':
        return 'bg-primary text-white'
      case 'ai':
        return isStepMessage 
          ? 'bg-orange-500 text-white' 
          : 'bg-white text-dark-200'
      case 'system':
        return 'bg-dark-400 text-gray-300'
      default:
        return 'bg-white text-dark-200'
    }
  }

  // Check if this is a step message to hide avatar
  const isStepMessage = message.content.includes('**Step') && message.type === 'ai'

  return (
    <div className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* Avatar - hidden for step messages and system messages */}
      {message.type !== 'system' && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarStyles()} ${isStepMessage ? 'invisible' : ''}`}>
          {getMessageIcon()}
        </div>
      )}
      
      {/* Message Content */}
      <div className="flex-1 min-w-0 max-w-full">
        <div 
          className={`max-w-full ${getMessageStyles()} ${message.type === 'user' ? 'ml-auto' : ''}`}
          style={message.type === 'user' ? {
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
          } : {
            padding: '16px',
            borderRadius: '8px'
          }}
        >
          <div className={message.type === 'user' ? 'break-words overflow-hidden' : 'text-sm leading-relaxed break-words overflow-hidden'}>
            {message.content.split('\n').map((line, index) => {
              // Handle markdown-style formatting for step messages
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <div key={index} className="font-semibold text-primary mb-1">
                    {line.replace(/\*\*/g, '')}
                  </div>
                )
              } else if (line.startsWith('📍')) {
                const url = line.substring(2)
                return (
                  <div key={index} className="text-xs text-gray-400 mt-2">
                    <span className="break-all overflow-hidden">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 underline"
                        title={url}
                      >
                        {url.length > 60 ? `${url.substring(0, 60)}...` : url}
                      </a>
                    </span>
                  </div>
                )
              } else {
                // Handle **text** patterns anywhere in the line
                const parts = line.split(/(\*\*[^*]+\*\*)/g)
                return (
                  <div key={index} className="break-words">
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
            })}
          </div>
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="p-2 bg-dark-400 rounded border">
                  <a 
                    href={attachment.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 text-sm"
                  >
                    {attachment.name || attachment.url}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Timestamp - hide for session messages */}
        {!(message.type === 'system' && (message.content.includes('Creating New Session') || message.content.includes('Session Created Successfully') || message.content.includes('Stopping Session') || message.content.includes('Session Stopped Successfully'))) && (
          <div className={`mt-1 text-xs text-gray-500 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  )
}
