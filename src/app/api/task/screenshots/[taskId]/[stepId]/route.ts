import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string; stepId: string } }
) {
  try {
    const { taskId, stepId } = params

    const browserUseApiKey = process.env.BROWSER_USE_API_KEY
    if (!browserUseApiKey) {
      return NextResponse.json(
        { error: 'Browser Use API key not configured' },
        { status: 500 }
      )
    }


    // Use the correct Browser Use API endpoint for screenshots
    const screenshotsResponse = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}/screenshots`, {
      headers: {
        'Authorization': `Bearer ${browserUseApiKey}`,
      },
    })

    if (!screenshotsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch screenshots from Browser Use API' },
        { status: screenshotsResponse.status }
      )
    }

    const screenshotsData = await screenshotsResponse.json()

    if (!screenshotsData.screenshots || screenshotsData.screenshots.length === 0) {
      return NextResponse.json(
        { error: 'No screenshots available for this task' },
        { status: 404 }
      )
    }

    // Try to find a screenshot that matches the step
    // Screenshots might be indexed by step number or have step info in the URL/filename
    const stepNumber = parseInt(stepId.split('-')[0]) || 0 // Try to extract step number
    let screenshotUrl = null

    // Method 1: Try to find by step index (screenshots array is likely ordered by step)
    if (screenshotsData.screenshots.length > stepNumber - 1 && stepNumber > 0) {
      screenshotUrl = screenshotsData.screenshots[stepNumber - 1]
    }

    // Method 2: If no step-specific match, get the latest screenshot
    if (!screenshotUrl) {
      screenshotUrl = screenshotsData.screenshots[screenshotsData.screenshots.length - 1]
    }

    // Fetch the actual screenshot image
    try {
      const imageResponse = await fetch(screenshotUrl)
      
      if (!imageResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch screenshot image' }, { status: 404 })
      }

      const contentType = imageResponse.headers.get('content-type')

      if (contentType?.startsWith('image/')) {
        // Return the image directly
        const imageBuffer = await imageResponse.arrayBuffer()
        
        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
          }
        })
      } else {
        // Return the screenshot URL
        return NextResponse.json({ screenshot_url: screenshotUrl })
      }
    } catch (imageError) {
      console.error('❌ [SCREENSHOT API] Error fetching screenshot image:', imageError)
      // Fallback: return the URL even if we can't fetch the image
      return NextResponse.json({ screenshot_url: screenshotUrl })
    }

  } catch (error) {
    console.error('❌ [SCREENSHOT API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screenshot' },
      { status: 500 }
    )
  }
} 