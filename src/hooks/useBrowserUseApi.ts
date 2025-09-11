import { useState, useCallback } from 'react'
import { browserUseApi, CreateTaskRequest, UpdateTaskRequest } from '@/services/browserUseApi'

// ===== STATE MANAGEMENT =====
export function useBrowserUseApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ===== API WRAPPER =====
  const apiCall = useCallback(async <T>(apiFn: () => Promise<T>): Promise<T> => {
    setLoading(true)
    setError(null)
    try {
      return await apiFn()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // ===== TASK OPERATIONS =====
  const createTask = useCallback((requestData: CreateTaskRequest) => 
    apiCall(() => browserUseApi.createTask(requestData)), [apiCall])

  const getTask = useCallback((taskId: string) => 
    apiCall(() => browserUseApi.getTask(taskId)), [apiCall])

  const listTasks = useCallback((params?: {
    pageSize?: number
    pageNumber?: number
    sessionId?: string
    filterBy?: 'started' | 'paused' | 'finished' | 'stopped'
    after?: string
    before?: string
  }) => apiCall(() => browserUseApi.listTasks(params)), [apiCall])

  const updateTask = useCallback((taskId: string, requestData: UpdateTaskRequest) => 
    apiCall(() => browserUseApi.updateTask(taskId, requestData)), [apiCall])

  // ===== TASK ACTIONS =====
  const stopTask = useCallback((taskId: string) => 
    updateTask(taskId, { action: 'stop' }), [updateTask])

  const pauseTask = useCallback((taskId: string) => 
    updateTask(taskId, { action: 'pause' }), [updateTask])

  const resumeTask = useCallback((taskId: string) => 
    updateTask(taskId, { action: 'resume' }), [updateTask])

  // ===== SESSION OPERATIONS =====
  const deleteSession = useCallback((sessionId: string) => 
    apiCall(() => browserUseApi.deleteSession(sessionId)), [apiCall])

  // ===== RETURN API =====
  return {
    loading,
    error,
    createTask,
    getTask,
    listTasks,
    updateTask,
    stopTask,
    pauseTask,
    resumeTask,
    deleteSession,
    clearError: () => setError(null)
  }
}
