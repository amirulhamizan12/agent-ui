
// New API v2 interfaces based on the documentation
interface CreateSessionRequest {
  profileId?: string | null
  proxyCountryCode?: string | null
}

interface CreateSessionResponse {
  id: string
  status: 'active' | 'stopped'
  startedAt: string
  liveUrl: string | null
  finishedAt: string | null
}

interface CreateTaskRequest {
  task: string
  llm?: string
  startUrl?: string | null
  maxSteps?: number
  structuredOutput?: string | null
  sessionId?: string | null
  metadata?: Record<string, string> | null
  secrets?: Record<string, string> | null
  allowedDomains?: string[] | null
  highlightElements?: boolean
  flashMode?: boolean
  thinking?: boolean
  vision?: boolean
  systemPromptExtension?: string
}

interface CreateTaskResponse {
  id: string
  sessionId?: string
}

interface TaskItem {
  id: string
  sessionId: string
  llm: string
  task: string
  status: 'started' | 'paused' | 'finished' | 'stopped'
  startedAt: string
  isScheduled: boolean
  finishedAt: string | null
  metadata: Record<string, unknown>
  output: string | null
  browserUseVersion: string | null
  isSuccess: boolean | null
}

interface ListTasksResponse {
  items: TaskItem[]
  totalItems: number
  pageNumber: number
  pageSize: number
}

interface TaskStep {
  number: number
  memory: string
  evaluationPreviousGoal: string
  nextGoal: string
  url: string
  actions: string[]
  screenshotUrl: string
}

interface OutputFile {
  id: string
  fileName: string
}

interface GetTaskResponse {
  id: string
  sessionId: string
  llm: string
  task: string
  status: 'started' | 'paused' | 'finished' | 'stopped'
  startedAt: string
  isScheduled: boolean
  steps: TaskStep[]
  outputFiles: OutputFile[]
  finishedAt: string | null
  metadata: Record<string, unknown>
  output: string | null
  browserUseVersion: string | null
  isSuccess: boolean | null
  liveUrl?: string | null
  publicShareUrl?: string | null
}

interface UpdateTaskRequest {
  action: 'stop' | 'pause' | 'resume' | 'stop_task_and_session'
}

// Legacy interfaces for backward compatibility
interface StartTaskRequest {
  prompt: string
  website?: string
  sessionId?: string
}

interface StartTaskResponse {
  taskId: string
  sessionId?: string
  message: string
}

interface TaskStatusResponse {
  id: string
  status: string
  steps: TaskStep[]
  output: string | null
  created_at: string
  finished_at: string | null
  output_files: string[]
  live_url: string | null
  public_share_url: string | null
}

class BrowserUseApiClient {
  private baseUrl: string = '/api/browser-use'

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    }
  }

  // New API v2 methods
  async createSession(requestData: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Browser Use API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorData
      })
      throw new Error(`Failed to create session: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  async createTask(requestData: CreateTaskRequest): Promise<CreateTaskResponse> {
    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Browser Use API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorData
      })
      throw new Error(`Failed to create task: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  async listTasks(params?: {
    pageSize?: number
    pageNumber?: number
    sessionId?: string
    filterBy?: 'started' | 'paused' | 'finished' | 'stopped'
    after?: string
    before?: string
  }): Promise<ListTasksResponse> {
    const searchParams = new URLSearchParams()
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    if (params?.pageNumber) searchParams.append('pageNumber', params.pageNumber.toString())
    if (params?.sessionId) searchParams.append('sessionId', params.sessionId)
    if (params?.filterBy) searchParams.append('filterBy', params.filterBy)
    if (params?.after) searchParams.append('after', params.after)
    if (params?.before) searchParams.append('before', params.before)

    const url = `${this.baseUrl}/tasks${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    const response = await fetch(url, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Browser Use API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorData
      })
      throw new Error(`Failed to list tasks: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  async getTask(taskId: string): Promise<GetTaskResponse> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Browser Use API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorData
      })
      throw new Error(`Failed to get task: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Browser Use API getTask response:', data)
    return data
  }

  async updateTask(taskId: string, requestData: UpdateTaskRequest): Promise<GetTaskResponse> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Browser Use API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorData
      })
      throw new Error(`Failed to update task: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        // If DELETE method is not supported (405), try alternative approach
        if (response.status === 405) {
          console.warn('Session DELETE method not supported, trying alternative approach...')
          
          // Try to get tasks for this session and stop them
          const tasksResponse = await this.listTasks({ sessionId })
          if (tasksResponse.items.length > 0) {
            // Stop all tasks in this session
            for (const task of tasksResponse.items) {
              if (task.status === 'started' || task.status === 'paused') {
                try {
                  await this.updateTask(task.id, { action: 'stop_task_and_session' })
                } catch (taskError) {
                  console.warn(`Failed to stop task ${task.id}:`, taskError)
                }
              }
            }
          }
          return // Exit successfully after trying alternative approach
        }
        
        const errorData = await response.text()
        console.error('Browser Use API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorData
        })
        throw new Error(`Failed to delete session: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Session deletion failed, trying alternative approach:', error)
      
      // Fallback: try to get tasks for this session and stop them
      try {
        const tasksResponse = await this.listTasks({ sessionId })
        if (tasksResponse.items.length > 0) {
          // Stop all tasks in this session
          for (const task of tasksResponse.items) {
            if (task.status === 'started' || task.status === 'paused') {
              try {
                await this.updateTask(task.id, { action: 'stop_task_and_session' })
              } catch (taskError) {
                console.warn(`Failed to stop task ${task.id}:`, taskError)
              }
            }
          }
        }
        console.log('Session stopped using alternative method')
      } catch (fallbackError) {
        console.error('Alternative session stopping method also failed:', fallbackError)
        throw error // Re-throw original error if fallback also fails
      }
    }
  }

  // Legacy method for backward compatibility
  async startTask(requestData: StartTaskRequest): Promise<StartTaskResponse> {
    // Convert legacy request to new API format
    const createTaskRequest: CreateTaskRequest = {
      task: requestData.prompt,
      startUrl: requestData.website || null,
      sessionId: requestData.sessionId || null,
      maxSteps: 30,
      highlightElements: true,
      vision: true,
      thinking: false,
      flashMode: false
    }

    const response = await this.createTask(createTaskRequest)
    
    return {
      taskId: response.id,
      sessionId: response.sessionId,
      message: 'Automation task started successfully'
    }
  }

  // Legacy method for backward compatibility
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const responseData = await this.getTask(taskId)

    // Convert new API response to legacy format
    const legacyResponse = {
      id: responseData.id,
      status: responseData.status,
      steps: responseData.steps || [],
      output: responseData.output,
      created_at: responseData.startedAt,
      finished_at: responseData.finishedAt,
      output_files: responseData.outputFiles?.map(file => file.fileName) || [],
      live_url: responseData.liveUrl || null,
      public_share_url: responseData.publicShareUrl || null
    }

    console.log('Legacy getTaskStatus response:', legacyResponse)
    return legacyResponse
  }

  // Legacy method for backward compatibility
  async stopTask(taskId: string): Promise<{ message: string; taskId: string }> {
    try {
      // First, try to get the task to get the sessionId
      const taskData = await this.getTask(taskId)
      
      if (taskData.sessionId) {
        // Use session deletion for more effective stopping
        console.log('Stopping task by deleting session:', taskData.sessionId)
        await this.deleteSession(taskData.sessionId)
        return {
          message: 'Task and session stopped successfully',
          taskId: taskId
        }
      } else {
        // Fallback to task update if no sessionId
        console.log('No sessionId found, using task update method')
        await this.updateTask(taskId, { action: 'stop' })
        return {
          message: 'Task stopped successfully',
          taskId: taskId
        }
      }
    } catch (error) {
      console.error('Error stopping task:', error)
      // Fallback to task update if session deletion fails
      try {
        await this.updateTask(taskId, { action: 'stop' })
        return {
          message: 'Task stopped successfully (fallback method)',
          taskId: taskId
        }
      } catch (fallbackError) {
        console.error('Fallback stop method also failed:', fallbackError)
        throw error
      }
    }
  }

}

export const browserUseApi = new BrowserUseApiClient()

// Export all types
export type { 
  StartTaskRequest, 
  StartTaskResponse, 
  TaskStatusResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  CreateTaskRequest,
  CreateTaskResponse,
  TaskItem,
  ListTasksResponse,
  TaskStep,
  OutputFile,
  GetTaskResponse,
  UpdateTaskRequest
} 