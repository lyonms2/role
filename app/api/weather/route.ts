import { NextRequest, NextResponse } from 'next/server'
import type { WeatherData } from '@/types'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  const key = process.env.OPENWEATHER_KEY

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat e lng são obrigatórios' }, { status: 400 })
  }

  const url = new URL('https://api.openweathermap.org/data/2.5/weather')
  url.searchParams.set('lat', lat)
  url.searchParams.set('lon', lng)
  url.searchParams.set('appid', key || '')
  url.searchParams.set('units', 'metric')
  url.searchParams.set('lang', 'pt_br')

  const res = await fetch(url.toString())
  if (!res.ok) {
    return NextResponse.json({ error: 'Falha ao buscar clima' }, { status: 500 })
  }
  const data = await res.json()

  const weather: WeatherData = {
    temp: Math.round(data.main.temp),
    condition: data.weather[0].main,
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    description: data.weather[0].description,
  }

  return NextResponse.json(weather)
}
