'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import { addStayReview } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'

interface Props {
  stayId: string
  stayName?: string
  onSuccess: () => void
}

interface PhotoEntry {
  file: File
  preview: string
}

export default function StayReviewForm({ stayId, stayName, onSuccess }: Props) {
  const [step, setStep] = useState<'idle' | 'form' | 'success'>('idle')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [familyFriendly, setFamilyFriendly] = useState(true)
  const [cleanliness, setCleanliness] = useState<'impecavel' | 'boa' | 'ruim'>('boa')
  const [service, setService] = useState<'excelente' | 'bom' | 'ruim'>('bom')
  const [priceValue, setPriceValue] = useState<'otimo' | 'bom' | 'ruim'>('bom')
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
    if (!text.trim()) { setError('Conta como foi a hospedagem 😊'); return }
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

      await addStayReview({
        stayId,
        ...(stayName ? { stayName } : {}),
        userId: user.uid,
        userName: user.displayName || 'Anônimo',
        ...(user.photoURL ? { userPhoto: user.photoURL } : {}),
        rating,
        familyFriendly,
        cleanliness,
        service,
        priceValue,
        text: text.trim(),
        ...(uploadedUrls.length ? { photos: uploadedUrls } : {}),
      })

      setStep('success')
      onSuccess()
    } catch (err) {
      console.error('[StayReviewForm]', err)
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
        <button onClick={() => setStep('form')} className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
          🛏️ Já me hospedei aqui — avaliar
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

      {/* Limpeza */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Como estava a limpeza?</label>
        <div className="flex gap-2">
          {([
            { v: 'impecavel', label: '✨ Impecável' },
            { v: 'boa',       label: '🙂 Boa' },
            { v: 'ruim',      label: '😕 Ruim' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => setCleanliness(v)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                cleanliness === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Atendimento */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Como foi o atendimento?</label>
        <div className="flex gap-2">
          {([
            { v: 'excelente', label: '😊 Excelente' },
            { v: 'bom',       label: '🙂 Bom' },
            { v: 'ruim',      label: '😕 Ruim' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => setService(v)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                service === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custo-benefício */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Como foi o custo-benefício?</label>
        <div className="flex gap-2">
          {([
            { v: 'otimo', label: '💰 Ótimo' },
            { v: 'bom',   label: '🙂 Bom' },
            { v: 'ruim',  label: '😬 Caro demais' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => setPriceValue(v)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                priceValue === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Família */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Boa para família com criança?</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setFamilyFriendly(true)}
            className={`flex-1 py-2 rounded-lg text-sm border transition-all ${familyFriendly ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            👨‍👩‍👧 Sim
          </button>
          <button type="button" onClick={() => setFamilyFriendly(false)}
            className={`flex-1 py-2 rounded-lg text-sm border transition-all ${!familyFriendly ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-200'}`}>
            Não muito
          </button>
        </div>
      </div>

      {/* Texto */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">O que você achou? O que recomenda?</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Conta pra galera a experiência, dicas do que aproveitar..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 resize-none"
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
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors">
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
