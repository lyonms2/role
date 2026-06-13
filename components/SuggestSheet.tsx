'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSuggestSheet, type SuggestType } from '@/lib/suggest-context'

const TYPES: { id: SuggestType; emoji: string; label: string; sub: string }[] = [
  { id: 'local',       emoji: '📍', label: 'Local',       sub: 'Praia, cachoeira, trilha...' },
  { id: 'restaurante', emoji: '🍽️', label: 'Restaurante', sub: 'Bar, café, lanchonete...' },
  { id: 'hospedagem',  emoji: '🏡', label: 'Hospedagem',  sub: 'Hotel, pousada, camping...' },
  { id: 'evento',      emoji: '🎭', label: 'Evento',      sub: 'Show, feira, festival...' },
]

const URLS: Record<SuggestType, string> = {
  local:       '/sugerir',
  restaurante: '/sugerir?tipo=comer',
  hospedagem:  '/sugerir?tipo=hospedar',
  evento:      '/eventos/sugerir',
}

export default function SuggestSheet() {
  const { isOpen, preType, closeSheet } = useSuggestSheet()
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (preType) {
        router.push(URLS[preType])
        closeSheet()
      } else {
        requestAnimationFrame(() => setVisible(true))
      }
    } else {
      setVisible(false)
    }
  }, [isOpen, preType])

  function handleClose() {
    setVisible(false)
    setTimeout(closeSheet, 260)
  }

  function go(type: SuggestType) {
    handleClose()
    setTimeout(() => router.push(URLS[type]), 260)
  }

  if (!isOpen || preType) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-250"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      <div
        className="relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-260 ease-out"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-8 pt-2 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">O que você quer sugerir?</h2>
              <p className="text-xs text-gray-400 mt-0.5">Nossa equipe revisa e publica gratuitamente</p>
            </div>
            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className="flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-orange-300 hover:bg-orange-50 transition-all active:scale-95 text-left"
              >
                <span className="text-3xl">{t.emoji}</span>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{t.label}</p>
                  <p className="text-xs text-gray-400 leading-tight mt-0.5">{t.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
