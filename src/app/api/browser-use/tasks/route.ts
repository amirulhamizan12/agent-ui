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
    const body = await req.json()

    const response = await fetch(`${BROWSER_USE_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'X-Browser-Use-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const text = await response.text()
    if (!response.ok) {
      return new NextResponse(text || 'Failed to create task', { status: response.status })
    }
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[API] /browser-use/tasks POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = getApiKey()
    const url = new URL(req.url)
    const search = url.search ? url.search : ''
    const response = await fetch(`${BROWSER_USE_BASE_URL}/tasks${search}`, {
      headers: { 'X-Browser-Use-API-Key': apiKey }
    })
    const text = await response.text()
    if (!response.ok) {
      return new NextResponse(text || 'Failed to list tasks', { status: response.status })
    }
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[API] /browser-use/tasks GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

