'use client'

import { useState, useEffect, useCallback } from 'react'
import { useBrowserUseApi } from '@/hooks/useBrowserUseApi'
import { TaskItem, browserUseApi } from '@/lib/browserUseApi'

export default function TaskManager() {
  const { listTasks, getTask, stopTask, pauseTask, resumeTask, deleteSession, loading, error } = useBrowserUseApi()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [taskDetails, setTaskDetails] = useState<{ steps?: { length: number } } | null>(null)
  const [loadingTaskDetails, setLoadingTaskDetails] = useState(false)

  const loadTasks = useCallback(async () => {
    try {
      const response = await listTasks({ pageSize: 10 })
      setTasks(response.items)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
  }, [listTasks])

  const loadTaskDetails = useCallback(async (taskId: string) => {
    try {
      setLoadingTaskDetails(true)
      const details = await browserUseApi.getTask(taskId)
      setTaskDetails(details)
    } catch (err) {
      console.error('Failed to load task details:', err)
    } finally {
      setLoadingTaskDetails(false)
    }
  }, [])

  const handleTaskAction = useCallback(async (taskId: string, action: 'stop' | 'pause' | 'resume') => {
    try {
      console.log(`Performing ${action} action on task:`, taskId)
      switch (action) {
        case 'stop':
          // Try to get task details first to get sessionId
          try {
            const taskData = await browserUseApi.getTask(taskId)
            if (taskData.sessionId) {
              console.log('Stopping by deleting session:', taskData.sessionId)
              await deleteSession(taskData.sessionId)
            } else {
              console.log('No sessionId, using regular stop method')
              await stopTask(taskId)
            }
          } catch (sessionError) {
            console.log('Session deletion failed, trying regular stop:', sessionError)
            await stopTask(taskId)
          }
          break
        case 'pause':
          await pauseTask(taskId)
          break
        case 'resume':
          await resumeTask(taskId)
          break
      }
      // Reload tasks after action
      await loadTasks()
      // Reload task details if this is the selected task
      if (selectedTask?.id === taskId) {
        await loadTaskDetails(taskId)
      }
    } catch (err) {
      console.error(`Failed to ${action} task:`, err)
      // You could add a toast notification here if you have one
    }
  }, [deleteSession, stopTask, pauseTask, resumeTask, loadTasks, loadTaskDetails, selectedTask?.id])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'started': return 'text-green-400'
      case 'paused': return 'text-yellow-400'
      case 'finished': return 'text-orange-400'
      case 'stopped': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'started':
        return (
          <>
            <button
              onClick={() => handleTaskAction(selectedTask!.id, 'pause')}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              Pause
            </button>
            <button
              onClick={() => handleTaskAction(selectedTask!.id, 'stop')}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Stop
            </button>
          </>
        )
      case 'paused':
        return (
          <button
            onClick={() => handleTaskAction(selectedTask!.id, 'resume')}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Resume
          </button>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading tasks...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Task Manager</h2>
        <button
          onClick={loadTasks}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task List */}
        <div className="bg-dark-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-3">Tasks ({tasks.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedTask(task)
                  loadTaskDetails(task.id)
                }}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  selectedTask?.id === task.id
                    ? 'bg-dark-300 border border-orange-500'
                    : 'bg-dark-300 hover:bg-dark-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{task.task}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(task.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Details */}
        <div className="bg-dark-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-3">Task Details</h3>
          {loadingTaskDetails ? (
            <div className="text-center text-gray-400 py-8">
              Loading task details...
            </div>
          ) : selectedTask ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Task ID</p>
                <p className="text-white text-sm font-mono">{selectedTask.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className={`text-sm font-medium ${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">LLM</p>
                <p className="text-white text-sm">{selectedTask.llm}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Started At</p>
                <p className="text-white text-sm">
                  {new Date(selectedTask.startedAt).toLocaleString()}
                </p>
              </div>
              {selectedTask.finishedAt && (
                <div>
                  <p className="text-sm text-gray-400">Finished At</p>
                  <p className="text-white text-sm">
                    {new Date(selectedTask.finishedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {taskDetails && (
                <div>
                  <p className="text-sm text-gray-400">Steps</p>
                  <p className="text-white text-sm">{taskDetails.steps?.length || 0}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {getStatusActions(selectedTask.status)}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Select a task to view details</p>
          )}
        </div>
      </div>
    </div>
  )
}
