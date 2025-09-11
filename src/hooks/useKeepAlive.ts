import { useEffect, useRef } from 'react'
import { useTask } from '@/context/TaskContext'
import { browserUseApi } from '@/services/browserUseApi'

// ===== KEEP-ALIVE HOOK =====
export function useKeepAlive() {
  const { state } = useTask()
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!state.isRunning || !state.taskId) return

    // ===== ACTIVITY TRACKING =====
    const updateActivity = () => lastActivityRef.current = Date.now()
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => document.addEventListener(event, updateActivity, true))

    // ===== KEEP-ALIVE MECHANISM =====
    keepAliveIntervalRef.current = setInterval(async () => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivityRef.current
      
      // Check for inactivity (5 minutes)
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        // Handle inactivity silently
      }

      // Send keep-alive ping
      try {
        if (state.taskId) {
          await browserUseApi.getTaskStatus(state.taskId)
        }
      } catch (error) {
        // Silently ignore keep-alive failures
      }
    }, 30 * 1000) // Ping every 30 seconds

    // ===== CLEANUP =====
    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current)
        keepAliveIntervalRef.current = null
      }
      events.forEach(event => document.removeEventListener(event, updateActivity, true))
    }
  }, [state.isRunning, state.taskId])
}
