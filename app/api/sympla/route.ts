import { NextResponse } from 'next/server'

const SYMPLA_TOKEN = process.env.SYMPLA_TOKEN

export async function GET(request: Request) {
  if (!SYMPLA_TOKEN) {
    return NextResponse.json({ events: [] })
  }

  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')

  try {
    const today = new Date().toISOString().split('T')[0]
    const params = new URLSearchParams({
      page: '1',
      page_size: '50',
      published: 'true',
      field_sort: 'start_date',
      sort: 'ASC',
      from: today,
    })

    const res = await fetch(`https://api.sympla.com.br/public/v3/events?${params}`, {
      headers: { 'S_TOKEN': SYMPLA_TOKEN },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json({ events: [] })
    }

    const data = await res.json()

    let events = ((data.data as any[]) || []).map((e) => ({
      id: String(e.id),
      name: e.name as string,
      description: (e.detail as string) || '',
      startDate: e.start_date as string,
      endDate: (e.end_date as string) || null,
      city: (e.address?.city as string) || '',
      state: (e.address?.state as string) || '',
      venue: (e.address?.name as string) || '',
      imageUrl: (e.image as string) || null,
      url: e.url as string,
      category: (e.category_prim?.name as string) || '',
    }))

    if (city) {
      const q = city.toLowerCase()
      events = events.filter((e) => e.city.toLowerCase().includes(q))
    }

    return NextResponse.json({ events })
  } catch {
    return NextResponse.json({ events: [] })
  }
}
