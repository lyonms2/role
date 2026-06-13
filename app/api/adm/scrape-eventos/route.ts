import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://www.minhaentrada.com.br'

export interface ScrapedEvent {
  name: string
  dateStr: string
  dateISO: string | null
  venue: string
  photoUrl: string
  ticketUrl: string
}

function parseDate(raw: string): string | null {
  // "Sex, 26/06/26 | Abertura 18:00 - Início 19:00"
  const dateMatch = raw.match(/(\d{2})\/(\d{2})\/(\d{2,4})/)
  if (!dateMatch) return null
  const [, day, month, year] = dateMatch
  const fullYear = year.length === 2 ? `20${year}` : year
  const timeMatch = raw.match(/Início\s+(\d{2}:\d{2})/) ?? raw.match(/Abertura\s+(\d{2}:\d{2})/)
  const time = timeMatch?.[1] ?? '19:00'
  return `${fullYear}-${month}-${day}T${time}:00`
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, '').trim()
}

export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado') ?? 'RS'

  let html: string
  try {
    const res = await fetch(`${BASE}/agenda-geral?estado=${estado}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}`, events: [] }, { status: 502 })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: 'Falha ao acessar o site', events: [] }, { status: 502 })
  }

  const events: ScrapedEvent[] = []
  const seen = new Set<string>()

  // Match every <a href="/evento/...">...</a> block
  const cardRe = /<a\s[^>]*href="(\/evento\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = cardRe.exec(html)) !== null) {
    const href = m[1]
    const inner = m[2]
    if (!inner.includes('<h4') || seen.has(href)) continue
    seen.add(href)

    const name = stripTags(inner.match(/<h4[^>]*>([\s\S]*?)<\/h4>/)?.[1] ?? '')
    if (!name) continue

    const ps = [...inner.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(x => stripTags(x[1]))
    const imgSrc = inner.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? ''

    events.push({
      name,
      dateStr: ps[0] ?? '',
      dateISO: parseDate(ps[0] ?? ''),
      venue: ps[1] ?? '',
      photoUrl: imgSrc,
      ticketUrl: `${BASE}${href}`,
    })
  }

  return NextResponse.json({ events, estado, total: events.length })
}
