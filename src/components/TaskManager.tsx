'use client'

import { useState, useEffect, useCallback } from 'react'
import { useBrowserUseApi } from '@/hooks/useBrowserUseApi'
import { TaskItem, browserUseApi } from '@/services/browserUseApi'

export default function TaskManager() {
  const { listTasks, stopTask, pauseTask, resumeTask, deleteSession, loading, error } = useBrowserUseApi()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [taskDetails, setTaskDetails] = useState<{
    steps?: Array<{
      number: number;
      nextGoal?: string;
      url?: string;
    }>;
    liveUrl?: string | null;
    publicShareUrl?: string | null;
    output?: string | null;
  } | null>(null)
  const [loadingTaskDetails, setLoadingTaskDetails] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'finished' | 'stopped'>('all')
  const [pageSize, setPageSize] = useState(25)
  const [pageNumber, setPageNumber] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const diff = Date.now() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const loadTasks = useCallback(async () => {
    try {
      const response = await listTasks({
        pageSize,
        pageNumber,
        filterBy: statusFilter === 'all' ? undefined : statusFilter,
      })
      // Sort newest first
      const sorted = [...response.items].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )
      setTasks(sorted)
      setTotalItems(response.totalItems)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
  }, [listTasks, pageSize, pageNumber, statusFilter])

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


  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Removed auto-refresh per request

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'started': return 'text-green-400'
      case 'paused': return 'text-yellow-400'
      case 'finished': return 'text-green-400'
      case 'stopped': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }


  const filteredTasks = tasks.filter((t) => {
    const matchesQuery = query.trim() === '' ? true : t.task.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter
    return matchesQuery && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // We no longer return early on loading; instead we show a non-blocking overlay

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header / Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Task Manager</h2>
          <span className="text-xs text-gray-400">{totalItems} total</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2 bg-dark-200 rounded px-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              className="bg-transparent text-sm text-white placeholder-gray-500 py-2 px-2 focus:outline-none w-72 sm:w-96"
            />
          </div>
          <div className="flex items-center gap-1 bg-dark-200 rounded p-1">
            {(['all','finished','stopped'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPageNumber(1) }}
                className={`text-xs px-2 py-1 rounded ${
                  statusFilter === s ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          
          <button
            onClick={loadTasks}
            disabled={loading}
            className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          >
            <svg
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M0 0h24v24H0z" fill="none" />
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Task List */}
        <div className="bg-dark-200 rounded-lg p-4 h-[calc(100vh-12rem)] flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-white">Tasks</h3>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Count</label>
              <select
                className="bg-dark-300 text-sm text-white rounded px-2 py-1"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPageNumber(1) }}
              >
                {[10,20,25,30,50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2 overflow-y-auto flex-1 pr-2">
            {filteredTasks.length === 0 ? (
              <div className="text-center text-gray-400 py-10 text-sm">No tasks found.</div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task)
                    loadTaskDetails(task.id)
                  }}
                  className={`p-3 rounded cursor-pointer transition-colors border ${
                    selectedTask?.id === task.id
                      ? 'bg-dark-300 border-orange-500'
                      : 'bg-dark-300 border-transparent hover:bg-dark-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate" title={task.task}>{task.task}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{formatRelativeTime(task.startedAt)}</span>
                        <span className="text-gray-600">•</span>
                        <span className="truncate">{task.llm}</span>
                        {task.finishedAt && null}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      task.status === 'started' ? 'bg-green-500/10 text-green-400' :
                      task.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                      task.status === 'finished' ? 'bg-green-500/10 text-green-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
            <span>
              Page {pageNumber} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (pageNumber > 1) setPageNumber(pageNumber - 1) }}
                className={`px-3 py-1 rounded bg-dark-300 text-white ${pageNumber === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-dark-400'}`}
                disabled={pageNumber === 1}
              >
                Prev
              </button>
              <button
                onClick={() => { if (pageNumber < totalPages) setPageNumber(pageNumber + 1) }}
                className={`px-3 py-1 rounded bg-dark-300 text-white ${pageNumber >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-dark-400'}`}
                disabled={pageNumber >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Task Details */}
        <div className="bg-dark-200 rounded-lg p-4 h-[calc(100vh-12rem)] overflow-y-auto pr-2 lg:col-span-3">
          <h3 className="text-lg font-medium text-white mb-3">Task Details</h3>
          {loadingTaskDetails ? (
            <div className="text-center text-gray-400 py-8">
              Loading task details...
            </div>
          ) : selectedTask ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Task ID</p>
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-mono break-all">{selectedTask.id}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedTask.id)}
                    className="text-xs px-2 py-0.5 bg-dark-300 text-gray-200 rounded hover:bg-dark-400"
                  >
                    Copy
                  </button>
                </div>
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
                  {new Date(selectedTask.startedAt).toLocaleString()} ({formatRelativeTime(selectedTask.startedAt)})
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
                <>
                  <div>
                    <p className="text-sm text-gray-400">Steps</p>
                    <p className="text-white text-sm">{taskDetails.steps?.length || 0}</p>
                  </div>
                  {(taskDetails.liveUrl || taskDetails.publicShareUrl) && (
                    <div className="flex items-center gap-2">
                      {taskDetails.liveUrl && (
                        <a className="text-sm text-orange-400 hover:underline" href={taskDetails.liveUrl} target="_blank" rel="noreferrer">Open Live</a>
                      )}
                      {taskDetails.publicShareUrl && (
                        <a className="text-sm text-orange-400 hover:underline" href={taskDetails.publicShareUrl} target="_blank" rel="noreferrer">Public Share</a>
                      )}
                    </div>
                  )}
                  {taskDetails.output && (
                    <div>
                      <p className="text-sm text-gray-400">Output</p>
                      <div className="bg-dark-300 rounded p-2 text-sm text-gray-200 max-h-40 overflow-auto whitespace-pre-wrap">
                        {taskDetails.output}
                      </div>
                    </div>
                  )}
                  {Array.isArray(taskDetails.steps) && taskDetails.steps.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Steps</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {[...taskDetails.steps].reverse().map((s) => (
                          <div key={s.number} className="bg-dark-300 rounded p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">Step {s.number}</span>
                              {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-orange-400 hover:underline truncate max-w-[14rem]">{s.url}</a>}
                            </div>
                            {s.nextGoal && (
                              <p className="text-xs text-gray-300 mt-1 truncate" title={s.nextGoal}>{s.nextGoal}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              {/* Action buttons removed per request */}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Select a task to view details</p>
          )}
        </div>
      </div>
    </div>
  )
}
