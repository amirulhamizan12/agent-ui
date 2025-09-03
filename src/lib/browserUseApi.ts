interface BrowserUseTask {
  id: string
  task: string
  status: 'created' | 'running' | 'finished' | 'stopped' | 'paused' | 'failed'
  output: string | null
  created_at: string
  finished_at: string | null
  steps: BrowserUseStep[]
  output_files: string[]
  live_url: string | null
  public_share_url: string | null
}

interface BrowserUseStep {
  id: string
  step: number
  evaluation_previous_goal: string
  next_goal: string
  url: string
}

interface StartTaskRequest {
  prompt: string
  website?: string
}

interface StartTaskResponse {
  taskId: string
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
  private baseUrl: string

  constructor() {
    // Use client-side environment variable or fallback to relative path
    this.baseUrl = (typeof window !== 'undefined' ? 
      window.location.origin : 
      process.env.NEXT_PUBLIC_API_URL || ''
    ) + '/api'
  }

  async startTask(data: StartTaskRequest): Promise<StartTaskResponse> {
    const response = await fetch(`${this.baseUrl}/task/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to start task')
    }

    return response.json()
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await fetch(`${this.baseUrl}/task/status/${taskId}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get task status')
    }

    return response.json()
  }

  async stopTask(taskId: string): Promise<{ message: string; taskId: string }> {
    const response = await fetch(`${this.baseUrl}/task/stop/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to stop task')
    }

    return response.json()
  }


}

export const browserUseApi = new BrowserUseApiClient()
export type { StartTaskRequest, StartTaskResponse, TaskStatusResponse } 