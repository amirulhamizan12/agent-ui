import { useEffect, useRef } from 'react'
import { useTask } from '@/context/TaskContext'

// ===== TASK CLEANUP HOOK =====
export function useTaskCleanup() {
  const { state } = useTask()
  const hasStoppedRef = useRef(false)

  // ===== CLEANUP ON PAGE UNLOAD =====
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (!state.isRunning || !state.taskId || hasStoppedRef.current) return
      
      const headers = {
        'Content-Type': 'application/json',
      }
      
      try {
        // Try to get sessionId first, then delete session
        fetch(`/api/browser-use/tasks/${state.taskId}`, {
          method: 'GET',
          headers,
          keepalive: true
        })
        .then(response => response.json())
        .then(data => {
          if (data.sessionId) {
            // Delete session for more effective stopping
            fetch(`/api/browser-use/sessions/${data.sessionId}`, {
              method: 'DELETE',
              headers,
              keepalive: true
            }).catch(() => {}) // Ignore errors during page unload
          } else {
            // Fallback to task update
            fetch(`/api/browser-use/tasks/${state.taskId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ action: 'stop' }),
              keepalive: true
            }).catch(() => {}) // Ignore errors during page unload
          }
        })
        .catch(() => {}) // Ignore errors during page unload
      } catch {
        // Ignore errors during page unload
      }
      
      hasStoppedRef.current = true
    }

    const handleVisibilityChange = () => {
      // Page hidden - could implement timeout mechanism if needed
      if (document.hidden && state.isRunning && state.taskId && !hasStoppedRef.current) {
        // User might just switch tabs, don't auto-stop
      }
    }

    // ===== EVENT LISTENERS =====
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.isRunning, state.taskId])

  // ===== RESET STOPPED FLAG =====
  useEffect(() => {
    if (state.taskId && state.isRunning) {
      hasStoppedRef.current = false
    }
  }, [state.taskId, state.isRunning])
}
