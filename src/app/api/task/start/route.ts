import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Task prompt is required' },
        { status: 400 }
      )
    }

    const browserUseApiKey = process.env.BROWSER_USE_API_KEY
    if (!browserUseApiKey) {
      return NextResponse.json(
        { error: 'Browser Use API key not configured' },
        { status: 500 }
      )
    }

    // Use the custom prompt directly
    const task = prompt

    // Prepare the request payload
    const requestPayload = {
      task,
      allowed_domains: null, // Allow any domain for custom prompts
      save_browser_data: false,
      llm_model: 'gemini-2.5-flash',
      use_adblock: true,
      use_proxy: true,
      proxy_country_code: 'us',
      highlight_elements: true,
      browser_viewport_width: 1280,
      browser_viewport_height: 960,
      max_agent_steps: 150,
      enable_public_share: true,
      structured_output_json: null // No structured output for custom prompts
    }


    // Call Browser Use API to start the task
    const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${browserUseApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    })


    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Browser Use API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorBody: errorData
      })
      
      // Try to parse error as JSON for better debugging
      try {
        const parsedError = JSON.parse(errorData)
        console.error('🔍 Parsed Error Details:', JSON.stringify(parsedError, null, 2))
      } catch (e) {
        console.error('📄 Raw Error Response:', errorData)
      }
      
      return NextResponse.json(
        { error: 'Failed to start task', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({ 
      taskId: data.id,
      message: 'Automation task started successfully'
    })

  } catch (error) {
    console.error('Error starting automation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 