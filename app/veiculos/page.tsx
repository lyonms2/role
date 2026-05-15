'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getApprovedVehicles } from '@/lib/firestore'
import type { Vehicle, VehicleCategory } from '@/types'
import { VEHICLE_CATEGORY_LABELS } from '@/types'

const ALL_CATEGORIES = Object.keys(VEHICLE_CATEGORY_LABELS) as VehicleCategory[]

const RENTCARS_AFFILIATE_ID = process.env.NEXT_PUBLIC_RENTCARS_AFFILIATE_ID

function getRentcarsUrl(city?: string) {
  const base = 'https://www.rentcars.com/pt-br/'
  const params = new URLSearchParams()
  if (RENTCARS_AFFILIATE_ID) params.set('partner', RENTCARS_AFFILIATE_ID)
  if (city) params.set('pickup_name', city)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

function RentCarsWidget({ city }: { city?: string }) {
  const url = getRentcarsUrl(city)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden border border-blue-100 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-extrabold text-xl tracking-tight">rentcars</p>
          <p className="text-blue-200 text-xs">Compare e economize no aluguel</p>
        </div>
        <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
          Parceiro oficial
        </span>
      </div>

      {/* Body */}
      <div className="bg-white px-5 py-4">
        {city && (
          <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2 mb-3 text-sm text-blue-700 font-medium">
            <span>📍</span>
            <span>Buscando em <strong>{city}</strong></span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          {[
            { num: '350+', label: 'Locadoras' },
            { num: '160', label: 'Países' },
            { num: '4.5★', label: 'Trustpilot' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl py-2">
              <p className="font-bold text-blue-700 text-sm">{s.num}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 mb-4 text-sm text-gray-600">
          <p className="flex items-center gap-2">✅ Cancelamento gratuito na maioria das reservas</p>
          <p className="flex items-center gap-2">✅ Melhor preço garantido</p>
          <p className="flex items-center gap-2">✅ Localiza, Movida, Hertz, Avis e muito mais</p>
        </div>

        <div className="bg-blue-600 text-white text-center font-bold py-3 rounded-xl text-sm">
          🚗 Comparar preços agora →
        </div>
      </div>
    </a>
  )
}

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
        <p className="text-gray-500 text-sm mt-1">Compare preços e chegue no rolê do seu jeito</p>
      </div>

      {/* Widget RentCars */}
      <div className="mb-8">
        <RentCarsWidget city={cityParam || undefined} />
      </div>

      {/* Locadoras locais & particulares */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Locadoras locais & particulares</h2>
        <p className="text-xs text-gray-400 mb-4">Indicações da comunidade — bikes, vans, quadriciclos e mais</p>

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
            <p className="font-semibold text-gray-700 mb-1">Nenhuma locadora local ainda</p>
            <p className="text-sm text-gray-400 mb-4">
              {cityFilter
                ? `Nada em "${cityFilter}" ainda. Que tal indicar?`
                : 'Conhece uma locadora local, bike share ou aluguel particular? Indica pra galera!'}
            </p>
            <Link href="/sugerir?tipo=veiculo"
              className="inline-block bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl">
              🚗 Indicar uma locadora local
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
        <div className="skeleton h-64 rounded-2xl mb-6" />
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    }>
      <VeiculosContent />
    </Suspense>
  )
}
