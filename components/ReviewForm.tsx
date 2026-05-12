'use client'

import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { addReview } from '@/lib/firestore'
import { verifyUserAtLocation } from '@/lib/geolocation'

interface Props {
  placeId: string
  placeLat: number
  placeLng: number
  onSuccess: () => void
}

export default function ReviewForm({ placeId, placeLat, placeLng, onSuccess }: Props) {
  const [step, setStep] = useState<'idle' | 'verifying' | 'form' | 'success' | 'blocked'>('idle')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [crowded, setCrowded] = useState<'sim' | 'nao' | 'moderado'>('moderado')
  const [familyFriendly, setFamilyFriendly] = useState(true)
  const [bestTime, setBestTime] = useState('')
  const [text, setText] = useState('')
  const [verifiedCoords, setVerifiedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleVerify() {
    setStep('verifying')
    setError('')
    try {
      const result = await verifyUserAtLocation(placeLat, placeLng, 5)
      if (result.verified) {
        setVerifiedCoords({ lat: result.userLat, lng: result.userLng })
        setStep('form')
      } else {
        setStep('blocked')
      }
    } catch {
      setError('Não conseguimos acessar sua localização. Verifique as permissões do browser.')
      setStep('idle')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Escolhe uma nota de 1 a 5 estrelas'); return }
    const user = auth.currentUser
    if (!user) { setError('Você precisa estar logado para avaliar'); return }

    setSaving(true)
    try {
      await addReview({
        placeId,
        userId: user.uid,
        userName: user.displayName || 'Anônimo',
        userPhoto: user.photoURL || undefined,
        rating,
        crowded,
        familyFriendly,
        bestTime,
        text,
        verified: !!verifiedCoords,
        userLat: verifiedCoords?.lat || 0,
        userLng: verifiedCoords?.lng || 0,
      })
      setStep('success')
      onSuccess()
    } catch {
      setError('Erro ao salvar review. Tenta de novo!')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <div className="text-3xl mb-2">🙌</div>
        <p className="font-bold text-green-800">Review verificada!</p>
        <p className="text-sm text-green-700">Valeu por ajudar a galera</p>
      </div>
    )
  }

  if (step === 'blocked') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
        <div className="text-3xl mb-2">📍</div>
        <p className="font-bold text-amber-800">Você precisa estar no local para avaliar</p>
        <p className="text-sm text-amber-700 mt-1">Só aceitamos reviews de quem realmente foi lá!</p>
        <button onClick={() => setStep('idle')} className="mt-3 text-sm text-amber-600 underline">
          Voltar
        </button>
      </div>
    )
  }

  if (step === 'idle' || step === 'verifying') {
    return (
      <div className="text-center">
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          onClick={handleVerify}
          disabled={step === 'verifying'}
          className="btn-primary w-full"
        >
          {step === 'verifying' ? '📍 Verificando localização...' : '⭐ Fui aqui — avaliar'}
        </button>
        <p className="text-xs text-gray-400 mt-2">Precisamos confirmar que você está no local</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Estrelas */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Sua nota</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              className={`text-3xl transition-transform ${i <= (hoverRating || rating) ? 'text-yellow-400 scale-110' : 'text-gray-200'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Lotado? */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Estava cheio?</label>
        <div className="flex gap-2">
          {(['nao', 'moderado', 'sim'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setCrowded(v)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                crowded === v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {v === 'nao' ? 'Vazio' : v === 'moderado' ? 'Moderado' : 'Cheio'}
            </button>
          ))}
        </div>
      </div>

      {/* Família */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Bom pra família com crianças?</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setFamilyFriendly(true)}
            className={`flex-1 py-2 rounded-lg text-sm border ${familyFriendly ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            👨‍👩‍👧 Sim
          </button>
          <button type="button" onClick={() => setFamilyFriendly(false)}
            className={`flex-1 py-2 rounded-lg text-sm border ${!familyFriendly ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-200'}`}>
            Não muito
          </button>
        </div>
      </div>

      {/* Melhor horário */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Melhor horário pra visitar</label>
        <input
          type="text"
          value={bestTime}
          onChange={(e) => setBestTime(e.target.value)}
          placeholder="Ex: de manhã cedo, fim de tarde..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
        />
      </div>

      {/* Texto */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Conta o que achou (opcional)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Compartilha sua experiência com a galera..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Salvando...' : '✅ Enviar review verificada'}
      </button>
    </form>
  )
}
