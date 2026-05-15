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
    // Etapa 1: pede o CDN URL ao Google via header (não expõe a chave no HTML)
    const metaRes = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&maxHeightPx=${h}&skipHttpRedirect=true`,
      {
        headers: { 'X-Goog-Api-Key': API_KEY },
        next: { revalidate: 86400 },
      }
    )

    if (!metaRes.ok) {
      console.error(`[photo] Google ${metaRes.status} para name=${name}`)
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    const { photoUri } = await metaRes.json()
    if (!photoUri) return NextResponse.json({ error: 'no uri' }, { status: 404 })

    // Etapa 2: baixa os bytes da CDN e devolve diretamente (sem redirecionar)
    const imgRes = await fetch(photoUri)
    if (!imgRes.ok || !imgRes.body) return NextResponse.json({ error: 'cdn failed' }, { status: 404 })

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    return new Response(imgRes.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (err) {
    console.error('[photo] erro:', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
