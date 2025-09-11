// Action Processor Service
// Handles execution of browser actions

import { browserUseApi } from '@/services/browserUseApi'
import { ParsedAction } from './actionParser'

export interface ActionProcessorResult {
  success: boolean
  taskId?: string
  sessionId?: string
  sessionLiveUrl?: string | null
  error?: string
}

export class ActionProcessor {
  private currentSessionId: string | null = null
  private currentSessionLiveUrl: string | null = null

  async processAction(action: ParsedAction): Promise<ActionProcessorResult> {
    try {
      // Handle idle action - no browser task needed
      if (action.type === 'idle') {
        console.log('[ActionProcessor] Idle action - no browser task needed')
        return { success: true }
      }

      // Handle browser action
      if (action.type === 'browser' && action.command) {
        console.log('[ActionProcessor] Processing browser action:', action.command)
        
        // Ensure we have a session
        if (!this.currentSessionId) {
          console.log('[ActionProcessor] Creating new session...')
          const session = await browserUseApi.createSession()
          this.currentSessionId = session.id
          this.currentSessionLiveUrl = session.liveUrl
          console.log('[ActionProcessor] Session created:', { id: session.id, liveUrl: session.liveUrl })
        }

        // Create browser task
        const task = await browserUseApi.createTask({
          task: action.command,
          sessionId: this.currentSessionId,
          maxSteps: 30,
          highlightElements: true,
          vision: true,
          thinking: false,
          flashMode: false
        })

        console.log('[ActionProcessor] Browser task created:', task.id)
        return {
          success: true,
          taskId: task.id,
          sessionId: task.sessionId || this.currentSessionId,
          sessionLiveUrl: this.currentSessionLiveUrl
        }
      }

      // No action to process
      return { success: true }
    } catch (error) {
      console.error('[ActionProcessor] Error processing action:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  setSessionId(sessionId: string | null) {
    this.currentSessionId = sessionId
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  getCurrentSessionLiveUrl(): string | null {
    return this.currentSessionLiveUrl
  }

  getCurrentSessionInfo(): { sessionId: string | null; sessionLiveUrl: string | null } {
    return {
      sessionId: this.currentSessionId,
      sessionLiveUrl: this.currentSessionLiveUrl
    }
  }
}

export const actionProcessor = new ActionProcessor()
