import { useCallback } from 'react'
import { useTask } from '@/context/TaskContext'
import { browserUseApi } from '@/lib/browserUseApi'
import { ChatMessage } from '@/context/TaskContext'

// ===== SESSION MANAGEMENT HOOK =====
export function useSessionManagement() {
  const { state, dispatch } = useTask()

  // ===== CHAT MESSAGE HELPERS =====
  const addChatMessage = useCallback((content: string, type: 'system' = 'system') => {
    const message: ChatMessage = {
      id: `session-${type}-${Date.now()}`,
      type,
      content,
      timestamp: new Date()
    }
    dispatch({ type: 'ADD_CHAT_MESSAGE', message })
  }, [dispatch])

  // ===== SESSION CREATION =====
  const createSession = useCallback(async () => {
    if (state.sessionStatus === 'creating' || state.sessionStatus === 'active') {
      return state.sessionId
    }

    try {
      dispatch({ type: 'CREATE_SESSION_START' })
      addChatMessage('🔄 **Creating New Session**')

      const sessionData = await browserUseApi.createSession({})
      
      dispatch({ 
        type: 'CREATE_SESSION_SUCCESS', 
        sessionId: sessionData.id,
        sessionLiveUrl: sessionData.liveUrl
      })

      addChatMessage('✅ **Session Created Successfully**')
      return sessionData.id
    } catch (error) {
      console.error('Failed to create session:', error)
      dispatch({ type: 'CREATE_SESSION_ERROR' })
      addChatMessage(`❌ **Session Creation Failed**\n\nFailed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }, [state.sessionStatus, state.sessionId, dispatch, addChatMessage])

  // ===== SESSION STOPPING =====
  const stopSession = useCallback(async () => {
    if (!state.sessionId) return

    try {
      addChatMessage('🔄 **Stopping Session**')
      await browserUseApi.deleteSession(state.sessionId)
      dispatch({ type: 'STOP_SESSION' })
      addChatMessage('✅ **Session Stopped Successfully**')
    } catch (error) {
      console.error('Failed to stop session:', error)
      dispatch({ type: 'STOP_SESSION' })
      addChatMessage('⚠️ **Session Stopped (with warnings)**\n\nSession has been stopped locally, but there may have been issues stopping it on the server. This is usually not a problem.')
    }
  }, [state.sessionId, dispatch, addChatMessage])

  // ===== SESSION ENSURING =====
  const ensureSession = useCallback(async () => {
    if (state.sessionStatus === 'active' && state.sessionId) {
      return state.sessionId
    }
    return await createSession()
  }, [state.sessionStatus, state.sessionId, createSession])

  // ===== RETURN API =====
  return {
    createSession,
    stopSession,
    ensureSession,
    sessionStatus: state.sessionStatus,
    sessionId: state.sessionId,
    sessionLiveUrl: state.sessionLiveUrl
  }
}
