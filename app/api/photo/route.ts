import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: 'unavailable' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  const w = searchParams.get('w') || '800'
  const h = searchParams.get('h') || '600'

  if (!name) return NextResponse.json({ error: 'missing name' }, { status: 400 })

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&maxHeightPx=${h}&skipHttpRedirect=true&key=${API_KEY}`,
      { next: { revalidate: 86400 } }
    )

    if (!res.ok) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const data = await res.json()
    if (!data.photoUri) return NextResponse.json({ error: 'no uri' }, { status: 404 })

    return NextResponse.redirect(data.photoUri, {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
