'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Square, RotateCcw, Play } from 'lucide-react'
import { useTask } from '@/context/TaskContext'
import { ChatMessage } from '@/context/TaskContext'
import ChatMessageComponent from './ChatMessage'
import { browserUseApi } from '@/lib/browserUseApi'
import { useSessionManagement } from '@/hooks/useSessionManagement'

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
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 max-w-full">
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
