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
    // Fetch sem skipHttpRedirect — o `fetch` segue o redirect do Google para a CDN
    // e retornamos os bytes diretamente, sem expor a API key ao cliente
    const res = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&maxHeightPx=${h}&key=${API_KEY}`,
    )

    if (!res.ok || !res.body) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return new Response(res.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
