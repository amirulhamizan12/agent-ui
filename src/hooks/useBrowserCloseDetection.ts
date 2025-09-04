import { useEffect, useRef } from 'react'
import { useTask } from '@/context/TaskContext'
import { browserUseApi } from '@/lib/browserUseApi'

export function useBrowserCloseDetection() {
  const { state } = useTask()
  const hasStoppedRef = useRef(false)

  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Only send stop request if task is running and we haven't already stopped it
      if (state.isRunning && state.taskId && !hasStoppedRef.current) {
        
        // Use sendBeacon to reliably send the stop request even when page is unloading
        const stopData = JSON.stringify({
          taskId: state.taskId,
          action: 'stop',
          timestamp: new Date().toISOString()
        })
        
        // Send stop request to Browser Use API using sendBeacon
        // Note: sendBeacon doesn't support custom headers, so we'll use a different approach
        try {
          // Use fetch with keepalive for better reliability during page unload
          // Try to get sessionId first, then delete session
          fetch(`https://api.browser-use.com/api/v2/tasks/${state.taskId}`, {
            method: 'GET',
            headers: {
              'X-Browser-Use-API-Key': process.env.NEXT_PUBLIC_BROWSER_USE_API_KEY || '',
              'Content-Type': 'application/json',
            },
            keepalive: true
          })
          .then(response => response.json())
          .then(data => {
            if (data.sessionId) {
              // Delete the session for more effective stopping
              fetch(`https://api.browser-use.com/api/v2/sessions/${data.sessionId}`, {
                method: 'DELETE',
                headers: {
                  'X-Browser-Use-API-Key': process.env.NEXT_PUBLIC_BROWSER_USE_API_KEY || '',
                  'Content-Type': 'application/json',
                },
                keepalive: true
              }).catch(() => {
                // Ignore errors during page unload
              })
            } else {
              // Fallback to task update
              fetch(`https://api.browser-use.com/api/v2/tasks/${state.taskId}`, {
                method: 'PATCH',
                headers: {
                  'X-Browser-Use-API-Key': process.env.NEXT_PUBLIC_BROWSER_USE_API_KEY || '',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'stop' }),
                keepalive: true
              }).catch(() => {
                // Ignore errors during page unload
              })
            }
          })
          .catch(() => {
            // Ignore errors during page unload
          })
        } catch (error) {
          // Ignore errors during page unload
        }
        
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
