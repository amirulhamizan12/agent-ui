import { useCallback } from 'react'
import { useTask } from '@/context/TaskContext'
import { browserUseApi } from '@/lib/browserUseApi'
import { ChatMessage } from '@/context/TaskContext'

export function useSessionManagement() {
  const { state, dispatch } = useTask()

  const createSession = useCallback(async () => {
    if (state.sessionStatus === 'creating' || state.sessionStatus === 'active') {
      return state.sessionId
    }

    try {
      dispatch({ type: 'CREATE_SESSION_START' })

      // Add session creation message to chat
      const creatingMessage: ChatMessage = {
        id: `session-creating-${Date.now()}`,
        type: 'system',
        content: '🔄 **Creating New Session**\n\nSetting up a new browser session for your tasks...',
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: creatingMessage })

      const sessionData = await browserUseApi.createSession({})
      
      dispatch({ 
        type: 'CREATE_SESSION_SUCCESS', 
        sessionId: sessionData.id,
        sessionLiveUrl: sessionData.liveUrl
      })

      // Add session success message to chat
      const successMessage: ChatMessage = {
        id: `session-success-${Date.now()}`,
        type: 'system',
        content: '✅ **Session Created Successfully**\n\nYour browser session is now ready. You can start sending tasks!',
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: successMessage })

      return sessionData.id
    } catch (error) {
      console.error('Failed to create session:', error)
      
      dispatch({ type: 'CREATE_SESSION_ERROR' })

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `session-error-${Date.now()}`,
        type: 'system',
        content: `❌ **Session Creation Failed**\n\nFailed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: errorMessage })

      throw error
    }
  }, [state.sessionStatus, dispatch])

  const stopSession = useCallback(async () => {
    if (!state.sessionId) return

    try {
      await browserUseApi.deleteSession(state.sessionId)
      
      dispatch({ type: 'STOP_SESSION' })

      // Add session stop message to chat
      const stopMessage: ChatMessage = {
        id: `session-stop-${Date.now()}`,
        type: 'system',
        content: '🛑 **Session Stopped**\n\nThe browser session has been stopped.',
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: stopMessage })
    } catch (error) {
      console.error('Failed to stop session:', error)
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `session-stop-error-${Date.now()}`,
        type: 'system',
        content: `❌ **Failed to Stop Session**\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: errorMessage })
    }
  }, [state.sessionId, dispatch])

  const ensureSession = useCallback(async () => {
    if (state.sessionStatus === 'active' && state.sessionId) {
      return state.sessionId
    }
    
    return await createSession()
  }, [state.sessionStatus, state.sessionId, createSession])

  return {
    createSession,
    stopSession,
    ensureSession,
    sessionStatus: state.sessionStatus,
    sessionId: state.sessionId,
    sessionLiveUrl: state.sessionLiveUrl
  }
}
