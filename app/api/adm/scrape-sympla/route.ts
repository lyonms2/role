import { NextRequest, NextResponse } from 'next/server'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9',
}

export interface ScrapedSymplaEvent {
  name: string
  dateStr: string
  dateISO: string
  endDateISO: string | null
  city: string
  state: string
  venueName: string
  venueAddress: string
  photoUrl: string
  ticketUrl: string
  lat: number | null
  lng: number | null
  mapsLink: string
}

function extractEventsJson(html: string): any[] {
  // Data is embedded as escaped JSON: "searchEventsResult\":{\"data\":[{...}]}"
  const marker = '"searchEventsResult\\":{\\\"data\\":[{'
  const altMarker = 'searchEventsResult\\":{\\"data\\":[{'

  // Find the raw escaped array
  const startIdx = html.indexOf('"searchEventsResult\\":{\\"data\\":[{')
  if (startIdx === -1) {
    // Try alternate escape pattern
    const alt = html.indexOf('searchEventsResult":{"data":[{')
    if (alt === -1) return []
    // Already unescaped somehow — find the array
    const arrayStart = html.indexOf('[{', alt)
    if (arrayStart === -1) return []
    const arrayEnd = findArrayEnd(html, arrayStart)
    try { return JSON.parse(html.slice(arrayStart, arrayEnd + 1)) } catch { return [] }
  }

  // Extract from the escaped string and unescape
  const arrayStart = html.indexOf('[{', startIdx)
  if (arrayStart === -1) return []
  const arrayEnd = findArrayEnd(html, arrayStart)
  const raw = html.slice(arrayStart, arrayEnd + 1)
  // Unescape: the JSON keys/values are wrapped in \" instead of "
  const unescaped = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  try { return JSON.parse(unescaped) } catch { return [] }
}

function findArrayEnd(html: string, start: number): number {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '[' || ch === '{') depth++
    else if (ch === ']' || ch === '}') { depth--; if (depth === 0) return i }
  }
  return html.length - 1
}

function toISO(dateStr: string): string {
  // Sympla gives UTC ISO: "2026-06-16T16:30:00+00:00" — convert to Brazil time (UTC-3)
  try {
    const d = new Date(dateStr)
    d.setHours(d.getHours() - 3)
    return d.toISOString().slice(0, 19)
  } catch {
    return dateStr
  }
}

function formatDatePt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

async function fetchPage(estado: string, page: number): Promise<{ events: any[]; total: number }> {
  const url = `https://www.sympla.com.br/eventos?s=${estado}${page > 1 ? `&page=${page}` : ''}`
  const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })
  if (!res.ok) return { events: [], total: 0 }
  const html = await res.text()
  // Extract total from "total\":180
  const totalMatch = html.match(/"total\\":(\d+)/)
  const total = totalMatch ? parseInt(totalMatch[1]) : 0
  return { events: extractEventsJson(html), total }
}

export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado') ?? 'SC'

  let firstPage: { events: any[]; total: number }
  try {
    firstPage = await fetchPage(estado, 1)
  } catch {
    return NextResponse.json({ error: 'Falha ao acessar o Sympla', events: [] }, { status: 502 })
  }

  if (!firstPage.events.length) {
    return NextResponse.json({ error: 'Não foi possível extrair eventos do Sympla', events: [] }, { status: 502 })
  }

  // Busca páginas restantes em paralelo
  const LIMIT = 24
  const totalPages = Math.ceil(firstPage.total / LIMIT)
  let allRaw = [...firstPage.events]

  if (totalPages > 1) {
    const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
    // Paralelo em chunks de 5 para não sobrecarregar
    for (let i = 0; i < pageNums.length; i += 5) {
      const chunk = pageNums.slice(i, i + 5)
      const results = await Promise.all(chunk.map((p) => fetchPage(estado, p).catch(() => ({ events: [], total: 0 }))))
      results.forEach((r) => allRaw.push(...r.events))
    }
  }

  // Deduplica por id
  const seen = new Set<number>()
  allRaw = allRaw.filter((ev) => {
    if (!ev.id || seen.has(ev.id)) return false
    seen.add(ev.id)
    return true
  })

  const events: ScrapedSymplaEvent[] = allRaw
    .filter((ev: any) => ev.name && ev.url && ev.start_date)
    .map((ev: any) => {
      const loc = ev.location ?? {}
      const startISO = toISO(ev.start_date)
      const endISO = ev.end_date ? toISO(ev.end_date) : null
      const lat = loc.lat ? parseFloat(loc.lat) : null
      const lng = loc.lon ? parseFloat(loc.lon) : null
      const venueAddress = [loc.address, loc.address_num, loc.neighborhood].filter(Boolean).join(', ')
      return {
        name: ev.name,
        dateStr: ev.start_date_formats?.pt ?? formatDatePt(startISO),
        dateISO: startISO,
        endDateISO: endISO,
        city: loc.city ?? '',
        state: loc.state ?? estado,
        venueName: loc.name ?? '',
        venueAddress,
        photoUrl: ev.images?.lg ?? ev.images?.original ?? '',
        ticketUrl: ev.url,
        lat,
        lng,
        mapsLink: lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : '',
      }
    })

  return NextResponse.json({ events, estado, total: events.length })
}
