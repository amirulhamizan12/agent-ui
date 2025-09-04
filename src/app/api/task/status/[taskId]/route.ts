import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    const timestamp = new Date().toISOString()
    const requestUrl = request.url


    const browserUseApiKey = process.env.BROWSER_USE_API_KEY
    if (!browserUseApiKey) {
      console.error('❌ [TASK STATUS API] Missing Browser Use API key')
      return NextResponse.json(
        { error: 'Browser Use API key not configured' },
        { status: 500 }
      )
    }

    // Check if this task has been requested to stop
    // In a real implementation, this would be stored in a database or cache
    // For now, we'll implement a simple check
    const stopRequested = false // This would be checked against your stop request cache

    if (stopRequested) {
      return NextResponse.json({
        id: taskId,
        status: 'stopped',
        steps: [],
        output: null,
        created_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        output_files: [],
        live_url: null,
        public_share_url: null
      })
    }

    // Get task status from Browser Use API
    const response = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${browserUseApiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Browser Use API error:', response.status, errorData)
      return NextResponse.json(
        { error: 'Failed to get task status' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Prepare response
    const responseData = {
      id: data.id,
      status: data.status,
      steps: data.steps || [],
      output: data.output,
      created_at: data.created_at,
      finished_at: data.finished_at,
      output_files: data.output_files || [],
      live_url: data.live_url,
      public_share_url: data.public_share_url
    }

    // Return Browser Use API response directly (no transformation needed)
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ [TASK STATUS API] Error getting task status:', {
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

// No transformation functions needed - using Browser Use API response directly 