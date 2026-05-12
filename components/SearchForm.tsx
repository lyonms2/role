'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PlaceCategory } from '@/types'

const CATEGORIES: { value: PlaceCategory; label: string }[] = [
  { value: 'praia', label: '🏖️ Praia' },
  { value: 'cachoeira', label: '🌊 Cachoeira' },
  { value: 'serra', label: '🏔️ Serra' },
  { value: 'cidade_historica', label: '🏛️ Cidade histórica' },
  { value: 'natureza', label: '🌿 Natureza' },
  { value: 'parque', label: '🎡 Parque' },
]

const RADII = [50, 100, 150, 200]

export default function SearchForm() {
  const router = useRouter()
  const [city, setCity] = useState('')
  const [radius, setRadius] = useState(100)
  const [category, setCategory] = useState<PlaceCategory | ''>('')
  const [predictions, setPredictions] = useState<Array<{ description: string; place_id: string }>>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState('')
  const [loading, setLoading] = useState(false)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!city) return
    setLoading(true)

    let lat = '', lng = ''
    if (selectedPlaceId) {
      const res = await fetch(`/api/places/details?place_id=${selectedPlaceId}`)
      const data = await res.json()
      if (data.location) {
        lat = data.location.lat
        lng = data.location.lng
      }
    }

    const params = new URLSearchParams({ city, radius: String(radius) })
    if (lat) params.set('lat', lat)
    if (lng) params.set('lng', lng)
    if (category) params.set('category', category)

    router.push(`/resultados?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Campo cidade */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          De onde você vai sair?
        </label>
        <input
          type="text"
          value={city}
          onChange={(e) => { setCity(e.target.value); setSelectedPlaceId('') }}
          placeholder="Ex: Florianópolis, SC"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-orange-400 bg-white"
          required
        />
        {predictions.length > 0 && (
          <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
            {predictions.map((p) => (
              <li
                key={p.place_id}
                onClick={() => {
                  setCity(p.description)
                  setSelectedPlaceId(p.place_id)
                  setPredictions([])
                }}
                className="px-4 py-3 cursor-pointer hover:bg-orange-50 text-sm border-b last:border-0 border-gray-100"
              >
                📍 {p.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Raio */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Até onde quer ir? <span className="text-orange-500 font-bold">{radius} km</span>
        </label>
        <div className="flex gap-2">
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                radius === r
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {r}km
            </button>
          ))}
        </div>
      </div>

      {/* Categorias */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Que tipo de rolê? <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(category === cat.value ? '' : cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                category === cat.value
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-70"
        style={{ background: loading ? '#ccc' : '#FF6B35' }}
      >
        {loading ? 'Buscando rolês...' : '🗺️ Descobrir rolês'}
      </button>

      <p className="text-center text-sm text-gray-400">
        Só lugares que valem a viagem ✅
      </p>
    </form>
  )
}
