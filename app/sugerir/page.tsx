'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import { CATEGORY_LABELS } from '@/types'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { PlaceCategory } from '@/types'

const CATEGORIES: [PlaceCategory, string][] = [
  ['praia',            CATEGORY_LABELS.praia],
  ['cachoeira',        CATEGORY_LABELS.cachoeira],
  ['trilha',           CATEGORY_LABELS.trilha],
  ['serra',            CATEGORY_LABELS.serra],
  ['cidade_historica', CATEGORY_LABELS.cidade_historica],
  ['parque',           CATEGORY_LABELS.parque],
]

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

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
    name: '', city: '', state: 'SC',
    category: '' as PlaceCategory | '',
    description: '', mapsLink: '', videoUrl: '',
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
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
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          photos,
          videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
          suggestedBy: user?.uid || 'anon',
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  function reset() {
    setStep(0)
    setStatus('idle')
    setForm({ name: '', city: '', state: 'SC', category: '', description: '', mapsLink: '', videoUrl: '' })
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
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(([val, label]) => (
                  <button key={val} type="button" onClick={() => update('category', val)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all text-left ${
                      form.category === val
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do lugar *</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ex: Cachoeira dos Bugres"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Cidade + Estado */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
                <input
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder="Ex: Urubici"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
                <select
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-green-500 bg-white"
                >
                  {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!form.category || !form.name.trim() || !form.city.trim()}
            className="w-full mt-8 py-4 rounded-xl font-bold text-white text-sm transition-all"
            style={{ background: (!form.category || !form.name.trim() || !form.city.trim()) ? '#86efac' : '#15803d' }}
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Link do Google Maps <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                value={form.mapsLink}
                onChange={(e) => update('mapsLink', e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
              {form.mapsLink.includes('maps') && (
                <p className="text-xs text-green-600 font-medium mt-1.5">📍 Link do Maps detectado</p>
              )}
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
              className="flex-[2] py-4 rounded-xl font-bold text-white text-sm"
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
