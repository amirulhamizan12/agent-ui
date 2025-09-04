import { useState, useCallback } from 'react'
import { browserUseApi, CreateTaskRequest, GetTaskResponse, ListTasksResponse, UpdateTaskRequest } from '@/lib/browserUseApi'

export function useBrowserUseApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTask = useCallback(async (requestData: CreateTaskRequest) => {
    setLoading(true)
    setError(null)
    try {
      const result = await browserUseApi.createTask(requestData)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getTask = useCallback(async (taskId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await browserUseApi.getTask(taskId)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const listTasks = useCallback(async (params?: {
    pageSize?: number
    pageNumber?: number
    sessionId?: string
    filterBy?: 'started' | 'paused' | 'finished' | 'stopped'
    after?: string
    before?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await browserUseApi.listTasks(params)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTask = useCallback(async (taskId: string, requestData: UpdateTaskRequest) => {
    setLoading(true)
    setError(null)
    try {
      const result = await browserUseApi.updateTask(taskId, requestData)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const stopTask = useCallback(async (taskId: string) => {
    return updateTask(taskId, { action: 'stop' })
  }, [updateTask])

  const pauseTask = useCallback(async (taskId: string) => {
    return updateTask(taskId, { action: 'pause' })
  }, [updateTask])

  const resumeTask = useCallback(async (taskId: string) => {
    return updateTask(taskId, { action: 'resume' })
  }, [updateTask])

  const stopTaskAndSession = useCallback(async (taskId: string) => {
    return updateTask(taskId, { action: 'stop_task_and_session' })
  }, [updateTask])

  const deleteSession = useCallback(async (sessionId: string) => {
    setLoading(true)
    setError(null)
    try {
      await browserUseApi.deleteSession(sessionId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

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
    stopTaskAndSession,
    deleteSession,
    clearError: () => setError(null)
  }
}
