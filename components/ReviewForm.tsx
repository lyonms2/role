'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import { addReview, getUserRankLabel } from '@/lib/firestore'
import { verifyUserAtLocation } from '@/lib/geolocation'
import { uploadToCloudinary } from '@/lib/cloudinary'

interface Props {
  placeId: string
  placeName?: string
  placeLat: number
  placeLng: number
  onSuccess: () => void
}

interface PhotoEntry {
  file: File
  preview: string
}

export default function ReviewForm({ placeId, placeName, placeLat, placeLng, onSuccess }: Props) {
  const [step, setStep] = useState<'idle' | 'verifying' | 'form' | 'success' | 'blocked'>('idle')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [crowded, setCrowded] = useState<'sim' | 'nao' | 'moderado'>('moderado')
  const [familyFriendly, setFamilyFriendly] = useState(true)
  const [signal, setSignal] = useState<'good' | 'weak' | 'none' | ''>('')
  const [bestTime, setBestTime] = useState('')
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [uploadProgress, setUploadProgress] = useState<number[]>([])
  const [verifiedCoords, setVerifiedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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
      setError('Não conseguimos pegar sua localização. Libera o GPS nas permissões do browser.')
      setStep('idle')
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const remaining = 3 - photos.length
    const toAdd = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...toAdd])
    e.target.value = ''
  }

  function removePhoto(i: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Escolhe uma nota de 1 a 5 estrelas ⭐'); return }
    if (!text.trim()) { setError('Conta o que você achou do rolê — campo obrigatório 📝'); return }
    const user = auth.currentUser
    if (!user) { setError('Entra na conta antes de avaliar 👋'); return }

    setSaving(true)
    setError('')
    try {
      const progresses = photos.map(() => 0)
      setUploadProgress(progresses)

      const uploadedUrls = await Promise.all(
        photos.map((p, i) =>
          uploadToCloudinary(p.file, (pct) => {
            setUploadProgress((prev) => prev.map((v, idx) => (idx === i ? pct : v)))
          })
        )
      )

      const reviewerRank = await getUserRankLabel(user.uid).catch(() => '🌱 Novato')
      await addReview({
        placeId,
        placeName,
        userId: user.uid,
        userName: user.displayName || 'Anônimo',
        userPhoto: user.photoURL || undefined,
        rating,
        crowded,
        familyFriendly,
        signal: signal || undefined,
        bestTime,
        text: text.trim(),
        photos: uploadedUrls.length ? uploadedUrls : undefined,
        verified: !!verifiedCoords,
        userLat: verifiedCoords?.lat || 0,
        userLng: verifiedCoords?.lng || 0,
        reviewerRank,
      })
      setStep('success')
      onSuccess()
    } catch {
      setError('Deu ruim ao salvar. Tenta de novo!')
    } finally {
      setSaving(false)
      setUploadProgress([])
    }
  }

  if (step === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <div className="text-3xl mb-2">🙌</div>
        <p className="font-bold text-green-800">Review enviada! 🙌</p>
        <p className="text-sm text-green-700">Valeu por ajudar a galera a descobrir rolês de verdade!</p>
      </div>
    )
  }

  if (step === 'blocked') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
        <div className="text-3xl mb-2">📍</div>
        <p className="font-bold text-amber-800">Você tá longe do local!</p>
        <p className="text-sm text-amber-700 mt-1">A gente só aceita reviews de quem tá realmente lá. Assim a galera confia! 📍</p>
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
          {step === 'verifying' ? '📍 Confirmando que você tá lá...' : '⭐ Fui nesse rolê — avaliar'}
        </button>
        <p className="text-xs text-gray-400 mt-2">A gente confirma que você tá lá antes de publicar 📍</p>
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
        <label className="block text-sm font-semibold text-gray-700 mb-2">Tava cheio?</label>
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
        <label className="block text-sm font-semibold text-gray-700 mb-2">Boa pra família com criança?</label>
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

      {/* Sinal de celular */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Sinal de celular</label>
        <div className="flex gap-2">
          {([
            { value: 'good', label: '📶 Bom' },
            { value: 'weak', label: '🔅 Fraco' },
            { value: 'none', label: '🚫 Sem sinal' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSignal(signal === opt.value ? '' : opt.value)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                signal === opt.value ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
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

      {/* Texto — obrigatório */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          O que você achou? <span className="text-red-500">*</span>
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Conta pra galera como foi o rolê..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
        />
      </div>

      {/* Fotos */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Fotos do passeio <span className="font-normal text-gray-400">(até 3)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {photos.map((p, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
              <Image src={p.preview} alt="" fill className="object-cover" unoptimized />
              {uploadProgress[i] != null && uploadProgress[i] < 100 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{uploadProgress[i]}%</span>
                </div>
              )}
              {!saving && (
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center leading-none"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {photos.length < 3 && !saving && (
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:border-orange-400 hover:text-orange-400 transition-colors">
              <span className="text-2xl leading-none">+</span>
              <span className="text-[10px] mt-1">foto</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Enviando...' : '✅ Enviar review verificada'}
      </button>
    </form>
  )
}
