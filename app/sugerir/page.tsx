'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import { CATEGORY_LABELS } from '@/types'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { PlaceCategory } from '@/types'

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [PlaceCategory, string][]

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const MAX_PHOTOS = 3

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] || null
}

export default function SugerirPage() {
  const [form, setForm] = useState({
    name: '', city: '', state: 'SC', category: '' as PlaceCategory | '',
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
      alert('Erro ao fazer upload. Tenta de novo.')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.description.length < 50) {
      alert('A descrição precisa ter no mínimo 50 caracteres.')
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
    setStatus('idle')
    setForm({ name: '', city: '', state: 'SC', category: '', description: '', mapsLink: '', videoUrl: '' })
    setPhotos([])
    setPreviews([])
  }

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Recebemos sua sugestão!</h2>
        <p className="text-gray-500">A gente analisa e publica em breve. Valeu por ajudar a galera a descobrir novos rolês!</p>
        <button onClick={reset} className="btn-primary mt-6 w-full">Sugerir outro lugar</button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-7">
        <div className="text-4xl mb-2">🙌</div>
        <h1 className="text-2xl font-bold text-gray-900">Conhece um lugar incrível?</h1>
        <p className="text-gray-500 mt-1">Conta pra gente e ajuda a galera a descobrir!</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4">

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do lugar *</label>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)}
            placeholder="Ex: Cachoeira dos Bugres"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
            <input required value={form.city} onChange={(e) => update('city', e.target.value)}
              placeholder="Ex: Urubici"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div className="w-24">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
            <select required value={form.state} onChange={(e) => update('state', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-orange-400 bg-white">
              {ESTADOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(([val, label]) => (
              <button key={val} type="button" onClick={() => update('category', val)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  form.category === val ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Descrição * <span className="text-gray-400 font-normal">({form.description.length}/50 mín.)</span>
          </label>
          <textarea required value={form.description} onChange={(e) => update('description', e.target.value)}
            rows={4} placeholder="O que tem de legal? Como é o lugar? Vale a viagem?"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
        </div>

        {/* Fotos — até 3 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Fotos (opcional) <span className="text-gray-400 font-normal">{photos.length}/{MAX_PHOTOS}</span>
          </label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <Image src={src} alt={`Foto ${idx + 1}`} fill className="object-cover" />
                {uploadingIdx === idx && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                    <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 transition-all" style={{ width: `${uploadProgress}%` }} />
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
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors">
                <span className="text-2xl">📷</span>
                <span className="text-xs">Adicionar</span>
              </button>
            )}
          </div>
        </div>

        {/* Vídeo YouTube */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vídeo do YouTube (opcional)</label>
          <input value={form.videoUrl} onChange={(e) => update('videoUrl', e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
          {videoId && (
            <div className="mt-2 rounded-xl overflow-hidden aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allowFullScreen
                title="Preview do vídeo"
              />
            </div>
          )}
          {form.videoUrl && !videoId && (
            <p className="text-xs text-red-400 mt-1">Link inválido. Use um link do YouTube.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link do Google Maps (opcional)</label>
          <input value={form.mapsLink} onChange={(e) => update('mapsLink', e.target.value)}
            placeholder="https://maps.google.com/..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
        </div>

        {status === 'error' && (
          <p className="text-red-500 text-sm">Ops, deu erro ao enviar. Tenta de novo!</p>
        )}

        <button type="submit" disabled={status === 'sending' || !form.category || uploadingIdx !== null}
          className="btn-primary" style={{ opacity: (!form.category || uploadingIdx !== null) ? 0.7 : 1 }}>
          {status === 'sending' ? 'Enviando...' : '🙌 Enviar sugestão'}
        </button>

      </form>
    </div>
  )
}
