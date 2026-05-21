'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { uploadToCloudinary } from '@/lib/cloudinary'

const SUGGESTION_CATEGORIES = [
  { group: '🌿 Ao Ar Livre', items: [
    { value: 'praia',     emoji: '🏖️', label: 'Praia' },
    { value: 'cachoeira', emoji: '💧', label: 'Cachoeira' },
    { value: 'trilha',    emoji: '🥾', label: 'Trilha' },
    { value: 'serra',     emoji: '⛰️', label: 'Serra' },
  ]},
  { group: '🎉 Lazer', items: [
    { value: 'parque',    emoji: '🌳', label: 'Parque' },
    { value: 'zoo',       emoji: '🦁', label: 'Zoo & Aquário' },
    { value: 'diversoes', emoji: '🎡', label: 'Diversões' },
    { value: 'mirante',   emoji: '🔭', label: 'Mirante' },
  ]},
  { group: '🎭 Cultura', items: [
    { value: 'museu',      emoji: '🏛️', label: 'Museu' },
    { value: 'patrimonio', emoji: '⛪', label: 'Patrimônio' },
    { value: 'teatro',     emoji: '🎨', label: 'Teatro & Arte' },
  ]},
]

interface CityPrediction {
  place_id: string
  description: string
  lat: number
  lng: number
  cityName: string
  stateCode: string
}

const MAX_PHOTOS = 3

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] || null
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${
          i < current
            ? 'w-6 h-2 bg-green-700'
            : i === current
            ? 'w-8 h-2 bg-green-700'
            : 'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

export default function SugerirPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', city: '', state: '',
    lat: 0, lng: 0,
    category: '',
    description: '', mapsLink: '', videoUrl: '',
  })
  const [cityInput, setCityInput] = useState('')
  const [cityPredictions, setCityPredictions] = useState<CityPrediction[]>([])
  const [citySelected, setCitySelected] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [resolvingCoords, setResolvingCoords] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cityInput.length < 3 || citySelected) { setCityPredictions([]); return }
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    cityDebounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(cityInput)}`)
      const data = await res.json()
      setCityPredictions(data.predictions || [])
    }, 400)
  }, [cityInput, citySelected])

  function selectCity(p: CityPrediction) {
    setCityInput(p.description)
    setForm((f) => ({ ...f, city: p.cityName || p.description, state: p.stateCode, lat: p.lat, lng: p.lng }))
    setCityPredictions([])
    setCitySelected(true)
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === 'mapsLink' && value.includes('maps')) {
      setResolvedCoords(null)
      setResolvingCoords(true)
      fetch(`/api/resolve-maps?url=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((d) => { if (d.lat && d.lng) setResolvedCoords({ lat: d.lat, lng: d.lng }) })
        .catch(() => {})
        .finally(() => setResolvingCoords(false))
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || photos.length >= MAX_PHOTOS) return
    const idx = photos.length
    const localUrl = URL.createObjectURL(file)
    setPreviews((p) => [...p, localUrl])
    setUploadingIdx(idx)
    setUploadProgress(0)
    try {
      const url = await uploadToCloudinary(file, setUploadProgress)
      setPhotos((p) => [...p, url])
    } catch {
      setPreviews((p) => p.filter((_, i) => i !== idx))
      alert('Deu ruim no upload. Tenta mais uma vez!')
    } finally {
      setUploadingIdx(null)
      setUploadProgress(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removePhoto(idx: number) {
    setPhotos((p) => p.filter((_, i) => i !== idx))
    setPreviews((p) => p.filter((_, i) => i !== idx))
  }

  const videoId = extractYouTubeId(form.videoUrl)

  async function handleSubmit() {
    if (form.description.length < 50) {
      alert('Conta mais sobre o lugar! Mínimo 50 caracteres.')
      return
    }
    setStatus('sending')
    try {
      const user = auth.currentUser
      await addDoc(collection(db, 'suggestions'), {
        name: form.name,
        city: form.city,
        state: form.state,
        lat: resolvedCoords?.lat ?? form.lat,
        lng: resolvedCoords?.lng ?? form.lng,
        category: form.category,
        description: form.description,
        mapsLink: form.mapsLink || null,
        photos: photos.length ? photos : null,
        videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
        suggestedBy: user?.uid || 'anon',
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  function reset() {
    setStep(0)
    setStatus('idle')
    setForm({ name: '', city: '', state: '', lat: 0, lng: 0, category: '', description: '', mapsLink: '', videoUrl: '' })
    setCityInput('')
    setCitySelected(false)
    setPhotos([])
    setPreviews([])
  }

  // ── Sucesso ───────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-4">🙌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Chegou! Valeu demais!</h2>
        <p className="text-gray-500 mb-6">Já anotamos e vamos dar uma olhada. Obrigado por ajudar a galera a achar novos rolês incríveis!</p>
        <div className="flex flex-col gap-3">
          <button onClick={reset} className="btn-primary w-full" style={{ background: '#15803d' }}>
            Sugerir outro rolê
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <StepDots current={step} total={3} />

      {/* ── PASSO 0 — Qual é o rolê? ──────────────────────── */}
      {step === 0 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🗺️</div>
            <h1 className="text-2xl font-bold text-gray-900">Qual é o rolê?</h1>
            <p className="text-gray-500 mt-1 text-sm">Conhece um lugar incrível? Manda ver, a galera agradece!</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Categoria */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de lugar *</label>
              <div className="flex flex-col gap-3">
                {SUGGESTION_CATEGORIES.map(({ group, items }) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">{group}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map(({ value, emoji, label }) => (
                        <button key={value} type="button" onClick={() => update('category', value)}
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 ${
                            form.category === value
                              ? 'bg-green-700 text-white border-green-700'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-green-200'
                          }`}>
                          <span>{emoji}</span>
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do lugar *</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ex: Praia do Rosa, Parque Estadual da Serra..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Cidade — autocomplete */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
              <input
                value={cityInput}
                onChange={(e) => { setCityInput(e.target.value); setCitySelected(false) }}
                placeholder="Ex: Urubici, SC"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
              {citySelected && form.state && (
                <p className="text-xs text-green-600 font-medium mt-1.5">📍 {form.city}, {form.state}</p>
              )}
              {cityPredictions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {cityPredictions.map((p) => (
                    <button
                      key={p.place_id}
                      type="button"
                      onClick={() => selectCity(p)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 border-b border-gray-100 last:border-0"
                    >
                      📍 {p.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!form.category || !form.name.trim() || !citySelected}
            className="w-full mt-8 py-4 rounded-xl font-bold text-white text-sm transition-all"
            style={{ background: (!form.category || !form.name.trim() || !citySelected) ? '#86efac' : '#15803d' }}
          >
            Próximo → Onde fica?
          </button>
        </div>
      )}

      {/* ── PASSO 1 — Onde fica? ──────────────────────────── */}
      {step === 1 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">📍</div>
            <h1 className="text-2xl font-bold text-gray-900">Onde fica?</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {form.name && <span className="font-semibold text-green-700">{form.name}</span>}
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Google Maps */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Link do Google Maps <span className="text-red-500">*</span>
                </label>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${form.name} ${form.city} ${form.state} Brasil`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  🗺️ Abrir Maps
                </a>
              </div>
              <input
                value={form.mapsLink}
                onChange={(e) => update('mapsLink', e.target.value)}
                placeholder="Cole aqui o link do Google Maps..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
              {form.mapsLink && !form.mapsLink.includes('maps') && (
                <p className="text-xs text-red-400 mt-1.5">Link inválido — precisa ser do Google Maps.</p>
              )}
              {form.mapsLink.includes('maps') && resolvingCoords && (
                <p className="text-xs text-gray-400 mt-1.5">⏳ Lendo localização do Maps...</p>
              )}
              {form.mapsLink.includes('maps') && !resolvingCoords && resolvedCoords && (
                <p className="text-xs text-green-600 font-medium mt-1.5">📍 Localização exata detectada!</p>
              )}
              {form.mapsLink.includes('maps') && !resolvingCoords && !resolvedCoords && (
                <p className="text-xs text-amber-500 mt-1.5">⚠️ Link válido, mas não foi possível extrair a localização exata.</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5">Abra o Maps, encontre o lugar, toque em "Compartilhar" e cole o link aqui.</p>
            </div>

            {/* YouTube */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Vídeo do YouTube <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={form.videoUrl}
                onChange={(e) => update('videoUrl', e.target.value)}
                placeholder="https://youtube.com/watch?v=... ou shorts/..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
              {form.videoUrl && !videoId && (
                <p className="text-xs text-red-400 mt-1.5">Link inválido — só aceitamos YouTube.</p>
              )}
              {videoId && (
                <>
                  <p className="text-xs text-green-600 font-medium mt-1.5">🎬 Vídeo encontrado!</p>
                  <div className="mt-2 rounded-xl overflow-hidden aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      className="w-full h-full"
                      allowFullScreen
                      title="Preview do vídeo"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(0)}
              className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">
              ← Voltar
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!form.mapsLink.includes('maps')}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ background: '#15803d' }}
            >
              Próximo → Convence a galera
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 2 — Convence a galera! ─────────────────── */}
      {step === 2 && (
        <div>
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🤩</div>
            <h1 className="text-2xl font-bold text-gray-900">Convence a galera!</h1>
            <p className="text-gray-500 mt-1 text-sm">Fotos e uma boa descrição fazem o lugar ganhar vida</p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Fotos */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Fotos <span className="text-gray-400 font-normal">(até {MAX_PHOTOS} · opcional)</span>
                <span className="ml-2 text-xs text-green-600 font-normal">{photos.length}/{MAX_PHOTOS}</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <Image src={src} alt={`Foto ${idx + 1}`} fill className="object-cover" />
                    {uploadingIdx === idx && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <span className="text-white text-xs mt-1">{uploadProgress}%</span>
                      </div>
                    )}
                    {uploadingIdx !== idx && (
                      <button type="button" onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && uploadingIdx === null && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs font-medium">Adicionar</span>
                  </button>
                )}
              </div>
              {photos.length === 0 && (
                <p className="text-xs text-gray-400 mt-2">Paisagem, trilha, acesso... qualquer foto ajuda!</p>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Descrição *
                <span className={`ml-2 text-xs font-normal ${form.description.length >= 50 ? 'text-green-500' : 'text-gray-400'}`}>
                  {form.description.length >= 50 ? '✓ Ótimo!' : `${form.description.length}/50 mín.`}
                </span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                placeholder="O que tem de especial? Vale o rolê? Como é o acesso? Manda tudo!"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 resize-none"
              />
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-sm text-center">Poxa, deu ruim no envio. Tenta de novo!</p>
            )}
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(1)}
              className="flex-1 py-4 rounded-xl font-bold text-gray-500 text-sm border border-gray-200 bg-white">
              ← Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={status === 'sending' || form.description.length < 50 || uploadingIdx !== null}
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm transition-all"
              style={{ background: (form.description.length < 50 || uploadingIdx !== null) ? '#86efac' : '#15803d' }}
            >
              {status === 'sending' ? 'Enviando...' : '🙌 Enviar sugestão!'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
