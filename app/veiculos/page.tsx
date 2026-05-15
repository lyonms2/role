'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApprovedVehicles } from '@/lib/firestore'
import type { Vehicle, VehicleCategory } from '@/types'
import { VEHICLE_CATEGORY_LABELS } from '@/types'

const ALL_CATEGORIES = Object.keys(VEHICLE_CATEGORY_LABELS) as VehicleCategory[]

const LOCADORAS_NACIONAIS = [
  { name: 'Localiza', emoji: '🚗', url: 'https://www.localiza.com', desc: 'Maior rede do Brasil' },
  { name: 'Movida', emoji: '🚙', url: 'https://www.movida.com.br', desc: 'Ótimo custo-benefício' },
  { name: 'Unidas', emoji: '🛻', url: 'https://www.unidas.com.br', desc: 'Carros novos e seminovos' },
  { name: 'Hertz', emoji: '🏎️', url: 'https://www.hertz.com.br', desc: 'Internacional com filiais no Brasil' },
]

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const label = VEHICLE_CATEGORY_LABELS[vehicle.category]
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-bold text-gray-900">{vehicle.name}</h3>
          <p className="text-xs text-gray-500">{vehicle.city}, {vehicle.state}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">{label}</span>
          {vehicle.pricePerDay && (
            <span className="text-xs font-bold text-gray-700">
              <span className="text-blue-700">R$ {vehicle.pricePerDay}</span>/dia
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{vehicle.description}</p>
      {vehicle.contactUrl && (
        <a href={vehicle.contactUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-600 font-semibold">
          Entrar em contato →
        </a>
      )}
    </div>
  )
}

function VeiculosContent() {
  const searchParams = useSearchParams()
  const cityParam = searchParams.get('city') || ''

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState(cityParam)
  const [categoryFilter, setCategoryFilter] = useState<VehicleCategory | ''>('')

  useEffect(() => {
    getApprovedVehicles().then((data) => {
      setVehicles(data)
      setLoading(false)
    })
  }, [])

  const filtered = vehicles.filter((v) => {
    const cityMatch = !cityFilter || v.city.toLowerCase().includes(cityFilter.toLowerCase())
    const catMatch = !categoryFilter || v.category === categoryFilter
    return cityMatch && catMatch
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/explorar" className="text-sm text-gray-400 mb-4 inline-block">← Explorar</Link>

      <div className="mb-6">
        <div className="text-4xl mb-2">🚗</div>
        <h1 className="text-2xl font-bold text-gray-900">Alugar Veículo</h1>
        <p className="text-gray-500 text-sm mt-1">Chegue no rolê do seu jeito — carro, moto, bike ou van</p>
      </div>

      {/* Locadoras nacionais */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Locadoras nacionais</h2>
        <div className="grid grid-cols-2 gap-3">
          {LOCADORAS_NACIONAIS.map((l) => (
            <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
              className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <span className="text-2xl">{l.emoji}</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">{l.name}</p>
                <p className="text-xs text-gray-500">{l.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Locais e particulares */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Locais & particulares</h2>

        <input
          type="text"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          placeholder="Filtrar por cidade..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 mb-4"
        />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button onClick={() => setCategoryFilter('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              categoryFilter === '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
            }`}>
            Todos
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                categoryFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {VEHICLE_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl">
            <div className="text-4xl mb-3">🏍️</div>
            <p className="font-semibold text-gray-700 mb-1">Nenhuma locadora local cadastrada</p>
            <p className="text-sm text-gray-400 mb-4">
              {cityFilter ? `Nada em "${cityFilter}" ainda.` : 'Conhece uma locadora local ou particular? Indica pra galera!'}
            </p>
            <Link href="/sugerir?tipo=veiculo"
              className="inline-block bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl">
              🚗 Indicar uma locadora
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function VeiculosPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    }>
      <VeiculosContent />
    </Suspense>
  )
}
