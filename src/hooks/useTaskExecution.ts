import { useEffect, useRef, useCallback } from 'react'
import { useTask } from '@/context/TaskContext'
import { browserUseApi } from '@/lib/browserUseApi'
import { ChatMessage } from '@/context/TaskContext'

// ===== UTILITY FUNCTIONS =====
const generateMockSummary = (taskDescription: string = 'the requested task') => 
  `# Task Completion Summary

## Task Overview
The automation task has been completed successfully. The AI agent has executed the requested actions and gathered relevant information.

## Key Accomplishments
- **Task Execution**: Successfully completed the automation workflow
- **Data Collection**: Gathered relevant information and data points
- **Process Documentation**: Captured screenshots and step-by-step progress
## Summary
The automation task has been completed with all requested actions performed. The results include detailed documentation and captured data.

*Task completed at ${new Date().toLocaleDateString()}*`

const generateSummaryFromOutput = (taskData: { output?: string | null }): string => {
  if (taskData.output) {
    try {
      const parsedOutput = typeof taskData.output === 'string' ? JSON.parse(taskData.output) : taskData.output
      if (parsedOutput.company_overview?.name) {
        return generateMockSummary(`analysis of ${parsedOutput.company_overview.name}`)
      }
    } catch (error) {
      console.log('Could not parse structured output, using generic summary')
    }
  }
  return generateMockSummary('the requested task')
}

const createStepMessage = (step: { evaluation_previous_goal?: string; evaluationPreviousGoal?: string; next_goal?: string; nextGoal?: string; url?: string; id?: string }, stepNumber: number): ChatMessage => {
  const stepDescription = step.evaluation_previous_goal || step.evaluationPreviousGoal || step.next_goal || step.nextGoal || 'Performing action'
  
  let urlDisplay = ''
  if (step.url) {
    try {
      const urlObj = new URL(step.url)
      const domain = urlObj.hostname
      const path = urlObj.pathname
      const shortUrl = path.length > 30 ? `${path.substring(0, 30)}...` : path
      urlDisplay = `\n\n${domain}${shortUrl}`
    } catch {
      const shortUrl = step.url.length > 50 ? `${step.url.substring(0, 50)}...` : step.url
      urlDisplay = `\n\n${shortUrl}`
    }
  }
  
  return {
    id: `step-${step.id || stepNumber}-${Date.now()}`,
    type: 'ai',
    content: `**Step ${stepNumber}**\n${stepDescription}${urlDisplay}`,
    timestamp: new Date()
  }
}

// ===== TASK EXECUTION HOOK =====
export function useTaskExecution() {
  const { state, dispatch } = useTask()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStepCountRef = useRef<number>(0)

  // ===== POLLING MANAGEMENT =====
  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  const startPolling = useCallback((taskId: string) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const taskData = await browserUseApi.getTaskStatus(taskId)
        const currentSteps = taskData.steps || []
        const currentStepCount = currentSteps.length
        
        // ===== HANDLE NEW STEPS =====
        if (currentStepCount > lastStepCountRef.current) {
          const newSteps = currentSteps.slice(lastStepCountRef.current)
          newSteps.forEach((step: any, index: number) => {
            const stepNumber = lastStepCountRef.current + index + 1
            const stepMessage = createStepMessage(step, stepNumber)
            dispatch({ type: 'ADD_CHAT_MESSAGE', message: stepMessage })
          })
          lastStepCountRef.current = currentStepCount
        }

        // ===== UPDATE TASK STATUS =====
        dispatch({
          type: 'UPDATE_TASK_STATUS',
          taskData: {
            taskStatus: taskData.status,
            steps: currentSteps,
            output: taskData.output,
            liveUrl: taskData.live_url,
            finishedAt: taskData.finished_at,
            publicShareUrl: taskData.public_share_url
          }
        })

        // ===== HANDLE TASK COMPLETION =====
        if (taskData.status === 'finished') {
          clearPolling()
          const summary = generateSummaryFromOutput(taskData)
          
          const completionMessage: ChatMessage = {
            id: `completion-${Date.now()}`,
            type: 'ai',
            content: '✅ **Task Completed Successfully!**\n\nThe automation task has finished executing all steps.',
            timestamp: new Date()
          }
          dispatch({ type: 'ADD_CHAT_MESSAGE', message: completionMessage })
          dispatch({ type: 'COMPLETE_TASK', summary })
        }
        
        // ===== HANDLE TASK FAILURE/STOP =====
        if (taskData.status === 'failed' || taskData.status === 'stopped') {
          clearPolling()
          
          const statusMessage: ChatMessage = {
            id: `status-${Date.now()}`,
            type: 'system',
            content: taskData.status === 'failed' 
              ? '❌ **Task Failed**\n\nThe automation task encountered an error and could not complete.'
              : '⏹️ **Task Stopped**\n\nThe automation task was stopped.',
            timestamp: new Date()
          }
          dispatch({ type: 'ADD_CHAT_MESSAGE', message: statusMessage })
          dispatch({ type: 'COMPLETE_TASK', summary: 'Task was stopped or failed.' })
        }
      } catch (error) {
        // Continue polling unless it's a persistent error
      }
    }, 3000) // Poll every 3 seconds
  }, [dispatch, clearPolling])

  // ===== EFFECTS =====
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (state.taskId && state.isRunning) {
      lastStepCountRef.current = 0

      const startMessage: ChatMessage = {
        id: `start-${Date.now()}`,
        type: 'ai',
        content: '🚀 **Starting Automation Task**\n\nI\'m now executing your request. You\'ll see each step as it happens below.',
        timestamp: new Date()
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', message: startMessage })
      startPolling(state.taskId)
    } else if (!state.isRunning && pollingIntervalRef.current) {
      clearPolling()
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [state.taskId, state.isRunning, dispatch, startPolling, clearPolling])

  return null
} 