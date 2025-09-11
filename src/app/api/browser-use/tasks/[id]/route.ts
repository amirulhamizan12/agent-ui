import { NextResponse } from 'next/server'

const BROWSER_USE_BASE_URL = 'https://api.browser-use.com/api/v2'

function getApiKey(): string {
  const key = process.env.BROWSER_USE_API_KEY
  if (!key) {
    throw new Error('Missing BROWSER_USE_API_KEY server environment variable')
  }
  return key
}

export async function GET(_req: Request, context: unknown) {
  try {
    const apiKey = getApiKey()
    const { params } = (context as { params?: { id?: string | string[] } }) ?? {}
    const idParam = Array.isArray(params?.id) ? params?.id?.[0] : params?.id
    const response = await fetch(`${BROWSER_USE_BASE_URL}/tasks/${idParam}`, {
      headers: { 'X-Browser-Use-API-Key': apiKey }
    })
    const text = await response.text()
    if (!response.ok) {
      return new NextResponse(text || 'Failed to get task', { status: response.status })
    }
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[API] /browser-use/tasks/[id] GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: unknown) {
  try {
    const apiKey = getApiKey()
    const body = await req.json()
    const { params } = (context as { params?: { id?: string | string[] } }) ?? {}
    const idParam = Array.isArray(params?.id) ? params?.id?.[0] : params?.id
    const response = await fetch(`${BROWSER_USE_BASE_URL}/tasks/${idParam}`, {
      method: 'PATCH',
      headers: {
        'X-Browser-Use-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    const text = await response.text()
    if (!response.ok) {
      return new NextResponse(text || 'Failed to update task', { status: response.status })
    }
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[API] /browser-use/tasks/[id] PATCH error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

