'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Timestamp } from 'firebase/firestore'
import { auth } from '@/lib/firebase'
import { addEatReview, getUserRankLabel } from '@/lib/firestore'
import { verifyUserAtLocation } from '@/lib/geolocation'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { EatReview } from '@/types'

interface Props {
  eatId: string
  eatName?: string
  placeLat?: number
  placeLng?: number
  onSuccess: () => void
  onCreated?: (review: EatReview) => void
}

interface PhotoEntry {
  file: File
  preview: string
}

export default function EatReviewForm({ eatId, eatName, placeLat, placeLng, onSuccess, onCreated }: Props) {
  const [step, setStep] = useState<'idle' | 'form' | 'success'>('idle')
  const [verifiedCoords, setVerifiedCoords] = useState<{ lat: number; lng: number; verified: boolean } | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [crowded, setCrowded] = useState<'tranquilo' | 'moderado' | 'lotado'>('moderado')
  const [foodQuality, setFoodQuality] = useState<'otima' | 'boa' | 'ruim'>('boa')
  const [priceRange, setPriceRange] = useState<'💲' | '💲💲' | '💲💲💲'>('💲💲')
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [uploadProgress, setUploadProgress] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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
    if (!text.trim()) { setError('Conta como foi a experiência 😊'); return }
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
      const reviewData = {
        eatId,
        ...(eatName ? { eatName } : {}),
        userId: user.uid,
        userName: user.displayName || 'Anônimo',
        ...(user.photoURL ? { userPhoto: user.photoURL } : {}),
        rating,
        crowded,
        foodQuality,
        priceRange,
        text: text.trim(),
        ...(uploadedUrls.length ? { photos: uploadedUrls } : {}),
        verified: verifiedCoords?.verified ?? false,
        userLat: verifiedCoords?.lat ?? 0,
        userLng: verifiedCoords?.lng ?? 0,
        reviewerRank,
      }
      const docId = await addEatReview(reviewData)

      onCreated?.({ ...reviewData, id: docId, createdAt: Timestamp.now() } as EatReview)
      setStep('success')
      onSuccess()
    } catch (err) {
      console.error('[EatReviewForm]', err)
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
        <p className="font-bold text-green-800">Review enviada!</p>
        <p className="text-sm text-green-700">Valeu por compartilhar!</p>
      </div>
    )
  }

  if (step === 'idle') {
    return (
      <div className="text-center">
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button onClick={async () => {
          setStep('form')
          if (placeLat != null && placeLng != null) {
            try {
              const r = await verifyUserAtLocation(placeLat, placeLng, 5)
              setVerifiedCoords({ lat: r.userLat, lng: r.userLng, verified: r.verified })
            } catch {}
          }
        }} className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm">
          🍽️ Já fui aqui — avaliar
        </button>
        <p className="text-xs text-gray-400 mt-2">Conta pra galera como foi!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Nota */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Sua nota geral</label>
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

      {/* Comida/bebida */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Como estava a comida/bebida?</label>
        <div className="flex gap-2">
          {([
            { v: 'otima', label: '😋 Excelente' },
            { v: 'boa',   label: '🙂 Boa' },
            { v: 'ruim',  label: '😕 Ruim' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => setFoodQuality(v)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                foodQuality === v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Movimento */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Como estava o movimento?</label>
        <div className="flex gap-2">
          {([
            { v: 'tranquilo', label: '😌 Tranquilo' },
            { v: 'moderado',  label: '🙂 Moderado' },
            { v: 'lotado',    label: '🏃 Lotado' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => setCrowded(v)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                crowded === v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Preço */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Quanto você gastou por pessoa?</label>
        <div className="flex gap-2">
          {([
            { v: '💲',   label: '💲 Econômico' },
            { v: '💲💲',  label: '💲💲 Moderado' },
            { v: '💲💲💲', label: '💲💲💲 Premium' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => setPriceRange(v)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                priceRange === v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Texto */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">O que você comeu? O que recomenda?</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Conta pra galera o que pediu, o que valeu a pena..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
        />
      </div>

      {/* Fotos */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Fotos <span className="font-normal text-gray-400">(até 3)</span>
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
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Enviando...' : '✅ Enviar avaliação'}
      </button>
    </form>
  )
}
