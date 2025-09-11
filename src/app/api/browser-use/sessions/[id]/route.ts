import { NextResponse } from 'next/server'

const BROWSER_USE_BASE_URL = 'https://api.browser-use.com/api/v2'

function getApiKey(): string {
  const key = process.env.BROWSER_USE_API_KEY
  if (!key) {
    throw new Error('Missing BROWSER_USE_API_KEY server environment variable')
  }
  return key
}

export async function DELETE(_req: Request, context: unknown) {
  try {
    const apiKey = getApiKey()
    const { params } = (context as { params?: { id?: string | string[] } }) ?? {}
    const idParam = Array.isArray(params?.id) ? params?.id?.[0] : params?.id
    const response = await fetch(`${BROWSER_USE_BASE_URL}/sessions/${idParam}`, {
      method: 'DELETE',
      headers: { 'X-Browser-Use-API-Key': apiKey }
    })
    if (response.status === 405) {
      return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
    }
    if (!response.ok) {
      const text = await response.text()
      return new NextResponse(text || 'Failed to delete session', { status: response.status })
    }
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[API] /browser-use/sessions/[id] DELETE error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

