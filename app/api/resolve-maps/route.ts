import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url obrigatória' }, { status: 400 })

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
    })
    const finalUrl = res.url

    // Padrão @lat,lng
    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) return NextResponse.json({ lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) })

    // Padrão ?q=lat,lng ou &q=lat,lng
    const qMatch = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (qMatch) return NextResponse.json({ lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) })

    // Padrão ll=lat,lng
    const llMatch = finalUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (llMatch) return NextResponse.json({ lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) })

    // Tenta extrair do HTML da resposta
    const html = await res.text()

    // Google embeds coords em vários formatos no HTML
    const htmlMatch = html.match(/\["(-?\d+\.\d{4,})",(-?\d+\.\d{4,})\]/) ||
                      html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) ||
                      html.match(/"lat":(-?\d+\.\d+),"lng":(-?\d+\.\d+)/)
    if (htmlMatch) return NextResponse.json({ lat: parseFloat(htmlMatch[1]), lng: parseFloat(htmlMatch[2]) })

    console.error('[resolve-maps] finalUrl:', finalUrl)
    return NextResponse.json({ error: 'Coordenadas não encontradas', finalUrl }, { status: 422 })
  } catch (e) {
    return NextResponse.json({ error: 'Falha ao resolver URL' }, { status: 500 })
  }
}
