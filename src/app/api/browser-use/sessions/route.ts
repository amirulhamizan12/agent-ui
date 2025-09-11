import { NextRequest, NextResponse } from 'next/server'

const BROWSER_USE_BASE_URL = 'https://api.browser-use.com/api/v2'

function getApiKey(): string {
  const key = process.env.BROWSER_USE_API_KEY
  if (!key) {
    throw new Error('Missing BROWSER_USE_API_KEY server environment variable')
  }
  return key
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey()
    const body = await req.json().catch(() => ({}))

    const response = await fetch(`${BROWSER_USE_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'X-Browser-Use-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const text = await response.text()
    if (!response.ok) {
      return new NextResponse(text || 'Failed to create session', { status: response.status })
    }
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[API] /browser-use/sessions POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

