'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const BOOKING_AID = process.env.NEXT_PUBLIC_BOOKING_AID

function getBookingUrl(city?: string) {
  const base = 'https://www.booking.com/searchresults.pt-br.html'
  const params = new URLSearchParams()
  if (BOOKING_AID) params.set('aid', BOOKING_AID)
  if (city) params.set('ss', city)
  params.set('lang', 'pt-br')
  const qs = params.toString()
  return qs ? `${base}?${qs}` : 'https://www.booking.com/pt-br/'
}

function BookingWidget({ city }: { city?: string }) {
  const url = getBookingUrl(city)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden border border-blue-100 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="bg-[#003580] px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-extrabold text-xl tracking-tight">booking<span className="text-[#009fe3]">.</span>com</p>
          <p className="text-blue-300 text-xs">Encontre o lugar perfeito pra descansar</p>
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
            <span>Buscando hospedagens em <strong>{city}</strong></span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          {[
            { num: '28M+', label: 'Hospedagens' },
            { num: '220', label: 'Países' },
            { num: 'Grátis', label: 'Cancelamento' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl py-2">
              <p className="font-bold text-[#003580] text-sm">{s.num}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 mb-4 text-sm text-gray-600">
          <p className="flex items-center gap-2">✅ Hotéis, pousadas, hostels, chalés e mais</p>
          <p className="flex items-center gap-2">✅ Cancelamento gratuito na maioria das opções</p>
          <p className="flex items-center gap-2">✅ Sem taxa de reserva — você paga direto na hospedagem</p>
        </div>

        <div className="bg-[#003580] text-white text-center font-bold py-3 rounded-xl text-sm">
          🏨 Ver hospedagens disponíveis →
        </div>
      </div>
    </a>
  )
}

function HospedarContent() {
  const searchParams = useSearchParams()
  const cityParam = searchParams.get('city') || ''

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/explorar" className="text-sm text-gray-400 mb-4 inline-block">← Explorar</Link>

      <div className="mb-6">
        <div className="text-4xl mb-2">🏡</div>
        <h1 className="text-2xl font-bold text-gray-900">Onde Dormir</h1>
        <p className="text-gray-500 text-sm mt-1">Pousadas, hotéis e o lugar certo pra descansar depois do rolê</p>
      </div>

      <BookingWidget city={cityParam || undefined} />
    </div>
  )
}

export default function HospedarPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    }>
      <HospedarContent />
    </Suspense>
  )
}
