'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-extrabold text-xl tracking-tight">rentcars</p>
          <p className="text-blue-200 text-xs">Compare e economize no aluguel</p>
        </div>
        <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
          Parceiro oficial
        </span>
      </div>

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

function VeiculosContent() {
  const searchParams = useSearchParams()
  const cityParam = searchParams.get('city') || ''

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/" className="text-sm text-gray-400 mb-4 inline-block">← Início</Link>

      <div className="mb-6">
        <div className="text-4xl mb-2">🚗</div>
        <h1 className="text-2xl font-bold text-gray-900">Alugar Carro</h1>
        <p className="text-gray-500 text-sm mt-1">Compare preços e chegue no rolê do seu jeito</p>
      </div>

      <RentCarsWidget city={cityParam || undefined} />
    </div>
  )
}

export default function VeiculosPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    }>
      <VeiculosContent />
    </Suspense>
  )
}
