import { useEffect, useRef } from 'react'
import { useTask } from '@/context/TaskContext'

export function useBrowserCloseDetection() {
  const { state } = useTask()
  const hasStoppedRef = useRef(false)

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only send stop request if task is running and we haven't already stopped it
      if (state.isRunning && state.taskId && !hasStoppedRef.current) {
        
        // Use sendBeacon to reliably send the stop request even when page is unloading
        const stopData = JSON.stringify({
          taskId: state.taskId,
          action: 'stop',
          timestamp: new Date().toISOString()
        })
        
        // Send stop request to our API
        navigator.sendBeacon(`/api/task/stop/${state.taskId}`, stopData)
        
        hasStoppedRef.current = true
      }
    }

    const handleVisibilityChange = () => {
      // If page becomes hidden and task is running, consider stopping it
      if (document.hidden && state.isRunning && state.taskId && !hasStoppedRef.current) {
        // Note: We don't automatically stop here as user might just switch tabs
        // But we could implement a timeout mechanism if needed
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.isRunning, state.taskId])

  // Reset the stopped flag when a new task starts
  useEffect(() => {
    if (state.taskId && state.isRunning) {
      hasStoppedRef.current = false
    }
  }, [state.taskId, state.isRunning])
}
