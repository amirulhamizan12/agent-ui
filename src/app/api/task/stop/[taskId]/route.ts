import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    const timestamp = new Date().toISOString()

    console.log('🛑 [STOP TASK API] Request received:', {
      timestamp,
      taskId,
      method: 'PUT',
      userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...'
    })

    const browserUseApiKey = process.env.BROWSER_USE_API_KEY
    if (!browserUseApiKey) {
      console.error('❌ [STOP TASK API] Missing Browser Use API key')
      return NextResponse.json(
        { error: 'Browser Use API key not configured' },
        { status: 500 }
      )
    }

    // Call Browser Use API to stop the task
    console.log('🔌 [STOP TASK API] Calling Browser Use API to stop task:', taskId)
    const response = await fetch(`https://api.browser-use.com/api/v1/stop-task?task_id=${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${browserUseApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('📡 [STOP TASK API] Browser Use API Response Status:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ [STOP TASK API] Browser Use API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorData
      })
      
      return NextResponse.json(
        { error: 'Failed to stop task', details: errorData },
        { status: response.status }
      )
    }

    console.log('✅ [STOP TASK API] Task stopped successfully:', taskId)
    
    return NextResponse.json({ 
      message: 'Task stopped successfully',
      taskId: taskId
    })

  } catch (error) {
    console.error('❌ [STOP TASK API] Error stopping task:', {
      taskId: params?.taskId,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
