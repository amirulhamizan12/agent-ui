'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Square, RotateCcw, Play, Bot, User, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useTask } from '@/context/TaskContext'
import { ChatMessage } from '@/context/TaskContext'
import { browserUseApi } from '@/lib/browserUseApi'
import { useSessionManagement } from '@/hooks/useSessionManagement'

interface ChatMessageProps {
  message: ChatMessage
}

function ChatMessageComponent({ message }: ChatMessageProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMessageIcon = () => {
    const isStepMessage = message.content.includes('**Step') && message.type === 'ai'
    
    switch (message.type) {
      case 'user':
        return <User className="w-4 h-4" />
      case 'ai':
        return isStepMessage ? <Play className="w-4 h-4" /> : <Bot className="w-4 h-4" />
      case 'system':
        // Different icons based on message content
        if (message.content.includes('error') || message.content.includes('Error') || message.content.includes('failed')) {
          return <AlertCircle className="w-4 h-4" />
        } else if (message.content.includes('success') || message.content.includes('Success') || message.content.includes('completed')) {
          return <CheckCircle className="w-4 h-4" />
        }
        return <Info className="w-4 h-4" />
      default:
        return <Bot className="w-4 h-4" />
    }
  }

  const getMessageStyles = () => {
    const isStepMessage = message.content.includes('**Step') && message.type === 'ai'
    
    switch (message.type) {
      case 'user':
        return 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25'
      case 'ai':
        return isStepMessage 
          ? 'bg-gradient-to-br from-orange-900/40 to-orange-800/40 border border-orange-500/40 text-white shadow-lg shadow-orange-500/10' 
          : 'bg-dark-300 text-white border border-dark-400 shadow-sm'
      case 'system':
        // Different styles based on message content
        if (message.content.includes('error') || message.content.includes('Error') || message.content.includes('failed')) {
          return 'bg-red-900/20 border border-red-500/30 text-red-200 mx-8 text-center shadow-lg shadow-red-500/10'
        } else if (message.content.includes('success') || message.content.includes('Success') || message.content.includes('completed')) {
          return 'bg-green-900/20 border border-green-500/30 text-green-200 mx-8 text-center shadow-lg shadow-green-500/10'
        }
        return 'bg-dark-400 text-gray-300 mx-8 text-center border border-dark-300'
      default:
        return 'bg-dark-300 text-white border border-dark-400 shadow-sm'
    }
  }

  const getAvatarStyles = () => {
    const isStepMessage = message.content.includes('**Step') && message.type === 'ai'
    
    switch (message.type) {
      case 'user':
        return 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25'
      case 'ai':
        return isStepMessage 
          ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25' 
          : 'bg-white text-dark-200 shadow-sm'
      case 'system':
        if (message.content.includes('error') || message.content.includes('Error') || message.content.includes('failed')) {
          return 'bg-red-500 text-white shadow-lg shadow-red-500/25'
        } else if (message.content.includes('success') || message.content.includes('Success') || message.content.includes('completed')) {
          return 'bg-green-500 text-white shadow-lg shadow-green-500/25'
        }
        return 'bg-dark-400 text-gray-300'
      default:
        return 'bg-white text-dark-200 shadow-sm'
    }
  }

  const isStepMessage = message.content.includes('**Step') && message.type === 'ai'
  const isSystemMessage = message.type === 'system'
  const isUserMessage = message.type === 'user'

  return (
    <div className={`flex items-start space-x-3 group ${isUserMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* Avatar */}
      {!isSystemMessage && !isStepMessage && message.type !== 'ai' && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${getAvatarStyles()} group-hover:scale-105`}>
          {getMessageIcon()}
        </div>
      )}
      
      {/* Message Content */}
      <div className="flex-1 min-w-0 max-w-full">
        <div 
          className={`max-w-full rounded-2xl px-4 py-3 transition-all duration-200 hover:shadow-lg ${getMessageStyles()} ${isUserMessage ? 'ml-auto' : ''} ${isStepMessage ? 'mr-12' : ''}`}
          style={isUserMessage ? {
            maxWidth: '77%',
            borderRadius: '20px 7px 20px 20px',
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.5',
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.01em'
          } : {
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.5',
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.01em'
          }}
        >
          <div className={`${isUserMessage ? 'break-words overflow-hidden' : 'break-words overflow-hidden'}`}>
            {message.content.split('\n').map((line, index) => {
              // Handle markdown-style formatting for step messages
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <div key={index} className="font-semibold text-orange-300 mb-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                    {line.replace(/\*\*/g, '')}
                  </div>
                )
              } else if (line.startsWith('📍')) {
                const url = line.substring(2)
                return (
                  <div key={index} className="text-xs text-gray-400 mt-2 p-2 bg-dark-400/50 rounded-lg border border-dark-300">
                    <span className="break-all overflow-hidden flex items-center gap-2">
                      <div className="w-1 h-1 bg-orange-400 rounded-full flex-shrink-0"></div>
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 underline transition-colors"
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
                          <strong key={partIndex} className="font-semibold text-orange-300">
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
                <div key={index} className="p-3 bg-dark-400/50 rounded-lg border border-dark-300 hover:bg-dark-400/70 transition-colors">
                  <a 
                    href={attachment.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-2 transition-colors"
                  >
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></div>
                    {attachment.name || attachment.url}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        {!(isSystemMessage && (message.content.includes('Creating New Session') || message.content.includes('Session Created Successfully') || message.content.includes('Stopping Session') || message.content.includes('Session Stopped Successfully'))) && (
          <div className={`mt-2 text-xs text-gray-500 ${isUserMessage ? 'text-right' : 'text-left'} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatInterface() {
  const { state, dispatch } = useTask()
  const { createSession, stopSession, ensureSession, sessionStatus, sessionId, sessionLiveUrl } = useSessionManagement()
  const [inputValue, setInputValue] = useState('')
  const [isStopping, setIsStopping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleStopTask = async () => {
    if (!state.taskId || isStopping) return

    setIsStopping(true)
    try {
      console.log('Stopping task:', state.taskId)
      const result = await browserUseApi.stopTask(state.taskId)
      console.log('Stop task result:', result)
      
      dispatch({ type: 'STOP_TASK' })

      // Add a system message about stopping
      const stopMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: result.message || 'Task has been stopped by user.',
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: stopMessage })

    } catch (error) {
      console.error('❌ Failed to stop task from chat interface:', error)
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Failed to stop task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: errorMessage })
    } finally {
      setIsStopping(false)
    }
  }

  const handleNewSession = async () => {
    // Stop current session if exists
    if (sessionId) {
      await stopSession()
    }
    
    // Reset session state
    dispatch({ type: 'RESET_SESSION' })
    
    // Create new session
    try {
      await createSession()
    } catch (error) {
      console.error('Failed to create new session:', error)
    }
  }

  const handleStartSession = async () => {
    try {
      await createSession()
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const autoResize = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px' // 128px = max-h-32
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [state.chatMessages])

  useEffect(() => {
    autoResize()
  }, [inputValue])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }
    dispatch({ type: 'ADD_CHAT_MESSAGE', message: userMessage })

    const userPrompt = inputValue.trim()
    setInputValue('')
    
    // Reset textarea height after sending
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = '28px'
      }
    }, 0)

    // Ensure we have a session before starting the task
    try {
      const currentSessionId = await ensureSession()
      
      // Start the automation task with the session ID
      const data = await browserUseApi.startTask({
        prompt: userPrompt,
        sessionId: currentSessionId || undefined
      })
      
      // Start task with taskId and sessionId
      dispatch({ 
        type: 'START_TASK', 
        taskId: data.taskId,
        sessionId: data.sessionId || currentSessionId || undefined
      })

      // Update current action
      dispatch({ 
        type: 'UPDATE_CURRENT_ACTION', 
        action: 'Starting task in session...' 
      })

    } catch (error) {
      console.error('❌ Failed to start task:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: `Sorry, I encountered an error while starting your task: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key configuration and try again.`,
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: errorMessage })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="w-full bg-dark-100 flex flex-col h-full lg:h-screen">

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 max-w-full scrollbar-hide">
        {state.chatMessages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            {sessionStatus === 'none' ? (
              <div className="space-y-4">
                <button
                  onClick={handleStartSession}
                  disabled={sessionStatus !== 'none'}
                  className="bg-primary hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Session</span>
                </button>
              </div>
            ) : (
              <p>Start a conversation by typing a message below</p>
            )}
          </div>
        ) : (
          state.chatMessages.map((message) => (
            <ChatMessageComponent key={message.id} message={message} />
          ))
        )}
        
        {/* Current Action Status */}
        {state.currentAction && (
          <div className="flex items-center justify-between p-4 bg-dark-300 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-gray-300 text-sm">{state.currentAction}</span>
            </div>
            <div className="flex items-center space-x-2">
              {sessionStatus === 'active' && !state.isRunning && (
                <button
                  onClick={handleNewSession}
                  className="text-orange-400 hover:text-orange-300 text-sm flex items-center space-x-1 px-2 py-1 rounded hover:bg-dark-400 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>New Session</span>
                </button>
              )}
              {state.isRunning && state.taskId && (
                <button
                  onClick={handleStopTask}
                  disabled={isStopping}
                  className="text-red-400 hover:text-red-300 text-sm flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-dark-400 transition-colors"
                >
                  <Square className="w-3 h-3" />
                  <span>{isStopping ? 'Stopping...' : 'Stop'}</span>
                </button>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 lg:p-6">
        <div className="flex flex-col gap-3 rounded-[22px] transition-all relative bg-dark-300 py-3 max-h-[300px] shadow-[0px_12px_32px_0px_rgba(0,0,0,0.2)] border border-dark-400">
          {/* Textarea Container */}
          <div className="pl-4 pr-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Send Message..."
              className="flex rounded-md border-input focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto flex-1 bg-transparent p-0 pt-[1px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full placeholder:text-gray-500 text-[15px] shadow-none resize-none min-h-[28px] text-white"
              rows={1}
              disabled={state.isRunning || sessionStatus === 'none' || sessionStatus === 'creating'}
              style={{ height: '28px' }}
            />
          </div>
          
          {/* Bottom Controls */}
          <div className="px-3 flex gap-2 items-center justify-end">
            {/* Right Side - Send */}
            <div className="min-w-0 flex gap-2 flex-shrink items-center">
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || state.isRunning || sessionStatus === 'none' || sessionStatus === 'creating'}
                className="w-8 h-8 bg-dark-400 hover:bg-dark-300 disabled:bg-dark-500 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded-full transition-colors flex items-center justify-center flex-shrink-0"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
