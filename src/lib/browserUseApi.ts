
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
  metadata: Record<string, any>
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
  metadata: Record<string, any>
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
  steps: any[]
  output: string | null
  created_at: string
  finished_at: string | null
  output_files: string[]
  live_url: string | null
  public_share_url: string | null
}

class BrowserUseApiClient {
  private apiKey: string
  private baseUrl: string = 'https://api.browser-use.com/api/v2'

  constructor() {
    // Get API key from environment variable
    this.apiKey = process.env.NEXT_PUBLIC_BROWSER_USE_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('Browser Use API key not found. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }
  }

  private getHeaders() {
    return {
      'X-Browser-Use-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  // New API v2 methods
  async createSession(requestData: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

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
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

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
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

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
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

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
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

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
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Browser Use API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorData
      })
      throw new Error(`Failed to delete session: ${response.status} ${response.statusText}`)
    }
  }

  // Legacy method for backward compatibility
  async startTask(requestData: StartTaskRequest): Promise<StartTaskResponse> {
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

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
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

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
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

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

  // Legacy method for backward compatibility - screenshots are now part of task steps
  async getScreenshots(taskId: string): Promise<{ screenshots: string[] }> {
    if (!this.apiKey) {
      throw new Error('Browser Use API key not configured. Please set NEXT_PUBLIC_BROWSER_USE_API_KEY environment variable.')
    }

    const taskData = await this.getTask(taskId)
    const screenshots = taskData.steps
      ?.map(step => step.screenshotUrl)
      .filter(url => url) || []

    return { screenshots }
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