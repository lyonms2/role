'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'praia',            label: '🏖️', name: 'Praia' },
  { value: 'cachoeira',        label: '🌊', name: 'Cachoeira' },
  { value: 'serra',            label: '🏔️', name: 'Serra' },
  { value: 'cidade_historica', label: '🏛️', name: 'Histórico' },
  { value: 'parque',           label: '🎡', name: 'Parque' },
]

const RADII = [50, 100, 150, 200]

type GpsState = 'idle' | 'locating' | 'found' | 'error'

interface Prediction {
  description: string
  place_id: string
  lat: number
  lng: number
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      { headers: { 'User-Agent': 'role-app/1.0' } }
    )
    const data = await res.json()
    const addr = data.address || {}
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || ''
    const state = addr.state_code || addr.ISO3166_2_lvl4?.replace('BR-', '') || ''
    return city ? `${city}${state ? `, ${state}` : ''}` : 'sua localização'
  } catch {
    return 'sua localização'
  }
}

export default function HomePage() {
  const router = useRouter()

  const [category, setCategory] = useState('')
  const [radius, setRadius] = useState(100)
  const [gpsState, setGpsState] = useState<GpsState>('idle')
  const [foundCity, setFoundCity] = useState('')
  const [showManual, setShowManual] = useState(false)

  // manual city search
  const [city, setCity] = useState('')
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (city.length < 3) { setPredictions([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(city)}`)
      const data = await res.json()
      setPredictions(data.predictions || [])
    }, 400)
  }, [city])

  function handleSelect(p: Prediction) {
    setCity(p.description)
    setSelected({ lat: p.lat, lng: p.lng })
    setPredictions([])
  }

  async function handleGps() {
    if (!navigator.geolocation) {
      setGpsState('error')
      setShowManual(true)
      return
    }
    setGpsState('locating')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const cityName = await reverseGeocode(lat, lng)
        setFoundCity(cityName)
        setGpsState('found')
        setTimeout(() => {
          const params = new URLSearchParams({
            city: cityName,
            lat: String(lat),
            lng: String(lng),
            radius: String(radius),
            map: '1',
          })
          if (category) params.set('category', category)
          router.push(`/resultados?${params.toString()}`)
        }, 600)
      },
      () => {
        setGpsState('error')
        setShowManual(true)
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!city) return
    const params = new URLSearchParams({ city, radius: String(radius) })
    if (selected) {
      params.set('lat', String(selected.lat))
      params.set('lng', String(selected.lng))
    }
    if (category) params.set('category', category)
    router.push(`/resultados?${params.toString()}`)
  }

  const gpsLabel = {
    idle:     '📍 Rolê perto de mim',
    locating: 'Buscando sua localização',
    found:    `✅ ${foundCity}`,
    error:    '😕 Não conseguimos sua localização',
  }[gpsState]

  return (
    <div className="min-h-[calc(100vh-130px)] flex flex-col px-4 py-8 max-w-md mx-auto w-full">

      {/* Hero */}
      <div className="text-center mt-4 mb-8">
        <h1 className="text-5xl font-extrabold mb-2" style={{ color: '#FF6B35' }}>Rolê</h1>
        <p className="text-gray-400 text-base">Descobre o rolê perfeito pra esse finde</p>
      </div>

      {/* Categorias */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-600 mb-3">Que tipo de rolê você tá afim?</p>
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => {
            const active = category === cat.value
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(active ? '' : cat.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-semibold text-sm transition-all ${
                  active
                    ? 'border-orange-400 bg-orange-500 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-500'
                }`}
              >
                <span className="text-base">{cat.label}</span>
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Raio */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-600 mb-3">
          Até onde vai? <span className="text-orange-500">{radius} km</span>
        </p>
        <div className="flex gap-2">
          {RADII.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                radius === r
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-orange-200'
              }`}
            >
              {r}km
            </button>
          ))}
        </div>
      </div>

      {/* Botão GPS — CTA principal */}
      <button
        onClick={handleGps}
        disabled={gpsState === 'locating' || gpsState === 'found'}
        className="w-full py-5 rounded-2xl font-extrabold text-lg text-white shadow-lg transition-all mb-4 relative overflow-hidden"
        style={{
          background: gpsState === 'error'
            ? '#ef4444'
            : gpsState === 'found'
            ? '#16a34a'
            : 'linear-gradient(135deg, #FF6B35 0%, #f97316 100%)',
        }}
      >
        {gpsState === 'locating' ? (
          <span className="flex items-center justify-center gap-3">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/80 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            Buscando sua localização...
          </span>
        ) : (
          gpsLabel
        )}
      </button>

      {/* Separador */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-100" />
        <button
          onClick={() => setShowManual((v) => !v)}
          className="text-sm text-gray-400 hover:text-orange-400 transition-colors font-medium"
        >
          {showManual ? 'fechar ↑' : 'ou buscar por cidade ↓'}
        </button>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Busca manual — expansível */}
      {showManual && (
        <form onSubmit={handleManualSubmit} className="card p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">De onde você vai sair?</label>
            <input
              type="text"
              value={city}
              onChange={(e) => { setCity(e.target.value); setSelected(null) }}
              placeholder="Ex: Florianópolis, SC"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 bg-white"
              autoFocus
              autoComplete="off"
            />
            {predictions.length > 0 && (
              <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {predictions.map((p) => (
                  <li
                    key={p.place_id}
                    onClick={() => handleSelect(p)}
                    className="px-4 py-3 cursor-pointer hover:bg-orange-50 text-sm border-b last:border-0 border-gray-100"
                  >
                    📍 {p.description}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={!city}
            className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all"
            style={{ background: !city ? '#fdba74' : '#FF6B35' }}
          >
            🗺️ Buscar rolês
          </button>
        </form>
      )}

      {/* Erro de geolocalização */}
      {gpsState === 'error' && !showManual && (
        <p className="text-center text-sm text-gray-400 mt-2">
          Permite o acesso à localização nas configurações do seu celular
        </p>
      )}

      {/* Features */}
      <div className="mt-auto pt-8 grid grid-cols-3 gap-3 text-center">
        {[
          { icon: '⭐', text: 'Reviews de quem foi lá' },
          { icon: '☀️', text: 'Clima em tempo real' },
          { icon: '🚗', text: 'Tempo de carro até lá' },
        ].map((f) => (
          <div key={f.text} className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="text-xl mb-1">{f.icon}</div>
            <p className="text-xs text-gray-400 leading-tight">{f.text}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
