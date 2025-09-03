import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    const body = await request.json()
    const { timestamp, lastActivity } = body

    console.log('💓 [KEEP-ALIVE API] Received keep-alive for task:', {
      taskId,
      timestamp,
      lastActivity,
      timeSinceLastActivity: Date.now() - lastActivity
    })

    // In a real implementation, you would:
    // 1. Update the task's last activity timestamp in your database
    // 2. Check if the task should be stopped due to inactivity
    // 3. Perform any necessary cleanup

    return NextResponse.json({
      success: true,
      message: 'Keep-alive received',
      taskId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [KEEP-ALIVE API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process keep-alive' },
      { status: 500 }
    )
  }
}
