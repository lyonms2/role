import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://www.minhaentrada.com.br'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9',
}

export interface ScrapedEvent {
  name: string
  dateStr: string
  dateISO: string | null
  venue: string
  photoUrl: string
  ticketUrl: string
  description: string
  mapsLink: string
  lat: number | null
  lng: number | null
}

function parseDate(raw: string): string | null {
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

function extractDescription(html: string): string {
  const match = html.match(/<div[^>]+id="texto-informacao"[^>]*>([\s\S]*?)<\/div>/)
  if (!match) return ''
  return match[1]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractLocation(html: string): { mapsLink: string; lat: number | null; lng: number | null } {
  // <a href="https://www.google.com/maps/search/-28.4746323,-49.0150254">
  const match = html.match(/href="(https:\/\/www\.google\.com\/maps\/search\/(-?\d+\.\d+),(-?\d+\.\d+))"/)
  if (!match) return { mapsLink: '', lat: null, lng: null }
  const lat = parseFloat(match[2])
  const lng = parseFloat(match[3])
  return {
    mapsLink: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    lat,
    lng,
  }
}

async function fetchDetails(href: string): Promise<{ description: string; mapsLink: string; lat: number | null; lng: number | null }> {
  try {
    const res = await fetch(`${BASE}${href}`, { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) return { description: '', mapsLink: '', lat: null, lng: null }
    const html = await res.text()
    return { description: extractDescription(html), ...extractLocation(html) }
  } catch {
    return { description: '', mapsLink: '', lat: null, lng: null }
  }
}

export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado') ?? 'RS'

  let html: string
  try {
    const res = await fetch(`${BASE}/agenda-geral?estado=${estado}`, { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}`, events: [] }, { status: 502 })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: 'Falha ao acessar o site', events: [] }, { status: 502 })
  }

  // Parse listing cards
  const partials: Omit<ScrapedEvent, 'description'>[] = []
  const seen = new Set<string>()
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
    partials.push({
      name,
      dateStr: ps[0] ?? '',
      dateISO: parseDate(ps[0] ?? ''),
      venue: ps[1] ?? '',
      photoUrl: imgSrc,
      ticketUrl: `${BASE}${href}`,
      _href: href,
    } as any)
  }

  // Fetch detail pages in parallel (max 10 concurrent)
  const CHUNK = 10
  const events: ScrapedEvent[] = []
  for (let i = 0; i < partials.length; i += CHUNK) {
    const chunk = partials.slice(i, i + CHUNK)
    const details = await Promise.all(chunk.map((e: any) => fetchDetails(e._href)))
    chunk.forEach((e: any, j) => {
      const { _href, ...rest } = e
      events.push({ ...rest, ...details[j] })
    })
  }

  return NextResponse.json({ events, estado, total: events.length })
}
