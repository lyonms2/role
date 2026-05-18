import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url obrigatória' }, { status: 400 })

  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
    const finalUrl = res.url

    // Extrai @lat,lng da URL final do Google Maps
    const match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (match) {
      return NextResponse.json({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) })
    }

    // Tenta extrair de query string ?q=lat,lng
    const qMatch = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (qMatch) {
      return NextResponse.json({ lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) })
    }

    return NextResponse.json({ error: 'Coordenadas não encontradas na URL' }, { status: 422 })
  } catch {
    return NextResponse.json({ error: 'Falha ao resolver URL' }, { status: 500 })
  }
}
