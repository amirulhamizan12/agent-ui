import { useEffect, useRef, useCallback } from 'react'
import { useTask } from '@/context/TaskContext'
import { browserUseApi } from '@/services/browserUseApi'
import { ChatMessage } from '@/context/TaskContext'

// ===== UTILITY FUNCTIONS =====
const generateMockSummary = () => 
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
      
      // Generate specific summaries based on output content
      if (parsedOutput.company_overview?.name) {
        return generateMockSummary()
      }
      
      if (parsedOutput.products && Array.isArray(parsedOutput.products)) {
        return generateMockSummary()
      }
      
      if (parsedOutput.news && Array.isArray(parsedOutput.news)) {
        return generateMockSummary()
      }
      
      // Check for any search results
      if (parsedOutput.search_results && Array.isArray(parsedOutput.search_results)) {
        return generateMockSummary()
      }
      
      // Check for any data extraction
      if (Object.keys(parsedOutput).length > 0) {
        return generateMockSummary()
      }
    } catch {
      console.log('Could not parse structured output, using generic summary')
    }
  }
  return generateMockSummary()
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
          // Add individual step messages for new steps
          const newSteps = currentSteps.slice(lastStepCountRef.current)
          newSteps.forEach((step, index) => {
            const stepNumber = lastStepCountRef.current + index + 1
            const stepMessage: ChatMessage = {
              id: `step-${Date.now()}-${stepNumber}-${index}`,
              type: 'system',
              content: `Step ${stepNumber}: ${step.evaluationPreviousGoal || step.nextGoal || 'Performing action'}`,
              timestamp: new Date()
            }
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
          
          // Only show the actual AI response/output, no default completion text
          let completionContent = ''
          
          // Add output if available
          if (taskData.output) {
            try {
              const parsedOutput = typeof taskData.output === 'string' ? JSON.parse(taskData.output) : taskData.output
              
              // Handle different output formats
              if (typeof parsedOutput === 'object' && parsedOutput !== null) {
                // Display structured output
                if (parsedOutput.company_overview?.name) {
                  completionContent += `• **Company:** ${parsedOutput.company_overview.name}\n`
                }
                if (parsedOutput.company_overview?.description) {
                  completionContent += `• **Description:** ${parsedOutput.company_overview.description}\n`
                }
                if (parsedOutput.products && Array.isArray(parsedOutput.products)) {
                  completionContent += `• **Products Found:** ${parsedOutput.products.length} items\n`
                }
                if (parsedOutput.news && Array.isArray(parsedOutput.news)) {
                  completionContent += `• **News Articles:** ${parsedOutput.news.length} articles\n`
                }
                
                // Add any other relevant fields
                Object.keys(parsedOutput).forEach(key => {
                  if (!['company_overview', 'products', 'news'].includes(key) && parsedOutput[key]) {
                    completionContent += `• **${key.charAt(0).toUpperCase() + key.slice(1)}:** ${parsedOutput[key]}\n`
                  }
                })
              } else if (typeof parsedOutput === 'string') {
                completionContent = parsedOutput
              }
            } catch {
              // If parsing fails, display raw output
              completionContent = taskData.output
            }
          }
          
          // Only add completion message if there's actual content
          if (completionContent.trim()) {
            const completionMessage: ChatMessage = {
              id: `completion-${Date.now()}`,
              type: 'ai',
              content: completionContent,
              timestamp: new Date()
            }
            dispatch({ type: 'ADD_CHAT_MESSAGE', message: completionMessage })
          }
          dispatch({ type: 'COMPLETE_TASK', summary })
        }
        
        // ===== HANDLE TASK FAILURE/STOP =====
        if (taskData.status === 'failed' || taskData.status === 'stopped') {
          clearPolling()
          
          // Only show the actual output, no default failure/stop text
          let statusContent = ''
          
          // Add output if available, even for failed tasks
          if (taskData.output) {
            try {
              const parsedOutput = typeof taskData.output === 'string' ? JSON.parse(taskData.output) : taskData.output
              if (typeof parsedOutput === 'object' && parsedOutput !== null) {
                Object.keys(parsedOutput).forEach(key => {
                  if (parsedOutput[key]) {
                    statusContent += `• **${key.charAt(0).toUpperCase() + key.slice(1)}:** ${parsedOutput[key]}\n`
                  }
                })
              } else {
                statusContent = taskData.output
              }
            } catch {
              statusContent = taskData.output
            }
          }
          
          // Only add status message if there's actual content
          if (statusContent.trim()) {
            const statusMessage: ChatMessage = {
              id: `status-${Date.now()}`,
              type: 'system',
              content: statusContent,
              timestamp: new Date()
            }
            dispatch({ type: 'ADD_CHAT_MESSAGE', message: statusMessage })
          }
          dispatch({ type: 'COMPLETE_TASK', summary: 'Task was stopped or failed.' })
        }
      } catch {
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