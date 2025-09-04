import { useEffect, useRef } from 'react'
import { useTask } from '@/context/TaskContext'
import { browserUseApi } from '@/lib/browserUseApi'

export function useKeepAlive() {
  const { state } = useTask()
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!state.isRunning || !state.taskId) {
      return
    }

    // Update last activity on user interaction
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    // Start keep-alive mechanism
    const startKeepAlive = () => {
      keepAliveIntervalRef.current = setInterval(async () => {
        const now = Date.now()
        const timeSinceLastActivity = now - lastActivityRef.current
        
        // If user has been inactive for more than 5 minutes, consider stopping the task
        if (timeSinceLastActivity > 5 * 60 * 1000) {
          // In a real implementation, you might want to pause or stop the task
          // For now, we'll just handle this silently
        }

        // Send keep-alive ping to Browser Use API (optional)
        try {
          // Since Browser Use API doesn't have a specific keep-alive endpoint,
          // we can use the task status check as a keep-alive mechanism
          await browserUseApi.getTaskStatus(state.taskId)
        } catch (error) {
          // Keep-alive ping failed - silently ignore
        }
      }, 30 * 1000) // Ping every 30 seconds
    }

    startKeepAlive()

    // Cleanup
    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current)
        keepAliveIntervalRef.current = null
      }
      
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })
    }
  }, [state.isRunning, state.taskId])
}
