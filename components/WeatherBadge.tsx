import type { WeatherData } from '@/types'

function getWeatherEmoji(condition: string): string {
  const c = condition.toLowerCase()
  if (c.includes('clear') || c.includes('sun')) return '☀️'
  if (c.includes('cloud') || c.includes('overcast')) return '☁️'
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️'
  if (c.includes('storm') || c.includes('thunder')) return '⛈️'
  if (c.includes('snow')) return '❄️'
  if (c.includes('fog') || c.includes('mist')) return '🌫️'
  return '🌤️'
}

interface Props {
  weather: WeatherData
  compact?: boolean
}

export default function WeatherBadge({ weather, compact = false }: Props) {
  const emoji = getWeatherEmoji(weather.condition)

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
        {emoji} {weather.temp}°C
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3">
      <span className="text-3xl">{emoji}</span>
      <div>
        <div className="font-semibold text-gray-800">{weather.temp}°C — {weather.description}</div>
        <div className="text-sm text-gray-500">Umidade: {weather.humidity}%</div>
      </div>
    </div>
  )
}
