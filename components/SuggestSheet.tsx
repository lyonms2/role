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

const FREE_URLS: Record<SuggestType, string> = {
  local:       '/sugerir',
  restaurante: '/sugerir?tipo=comer',
  hospedagem:  '/sugerir?tipo=hospedar',
  evento:      '/eventos/sugerir',
}

const PAID_URLS: Record<SuggestType, string> = {
  local:       '/anunciar',
  restaurante: '/anunciar',
  hospedagem:  '/anunciar',
  evento:      '/eventos/sugerir?plan=paid',
}

export default function SuggestSheet() {
  const { isOpen, preType, closeSheet } = useSuggestSheet()
  const router = useRouter()
  const [step, setStep] = useState<'type' | 'plan'>('type')
  const [selectedType, setSelectedType] = useState<SuggestType | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedType(preType)
      setStep(preType ? 'plan' : 'type')
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [isOpen, preType])

  function handleClose() {
    setVisible(false)
    setTimeout(closeSheet, 260)
  }

  function selectType(type: SuggestType) {
    setSelectedType(type)
    setStep('plan')
  }

  function go(url: string) {
    handleClose()
    setTimeout(() => router.push(url), 260)
  }

  if (!isOpen) return null

  const typeInfo = TYPES.find((t) => t.id === selectedType)

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-250"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-260 ease-out"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-8 pt-2 max-w-lg mx-auto w-full">

          {step === 'type' && (
            <>
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
                    onClick={() => selectType(t.id)}
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
            </>
          )}

          {step === 'plan' && selectedType && typeInfo && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => { if (preType) { handleClose() } else { setStep('type') } }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold"
                >
                  {preType ? '✕' : '←'}
                </button>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Sugerindo</p>
                  <p className="font-bold text-gray-900 text-sm">{typeInfo.emoji} {typeInfo.label}</p>
                </div>
              </div>

              <h2 className="text-base font-bold text-gray-900 mb-1">Como quer publicar?</h2>
              <p className="text-xs text-gray-400 mb-5">Escolha a visibilidade do seu conteúdo</p>

              <div className="flex flex-col gap-3">
                {/* Gratuito */}
                <button
                  onClick={() => go(FREE_URLS[selectedType])}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-green-300 hover:bg-green-50 transition-all active:scale-[0.98] text-left w-full"
                >
                  <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">✅</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">Gratuito</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Revisão pela equipe e publicação sem custo</p>
                  </div>
                  <span className="text-gray-300 font-bold text-lg flex-shrink-0">›</span>
                </button>

                {/* Destaque pago */}
                <button
                  onClick={() => go(PAID_URLS[selectedType])}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 transition-all active:scale-[0.98] text-left w-full relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">POPULAR</span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⭐</span>
                  </div>
                  <div className="flex-1 min-w-0 pr-12">
                    <p className="font-bold text-amber-800 text-sm">Com Destaque</p>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">Aparece primeiro nos resultados + badge especial</p>
                  </div>
                  <span className="text-amber-400 font-bold text-lg flex-shrink-0">›</span>
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
