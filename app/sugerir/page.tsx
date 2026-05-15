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

export default function SugerirPage() {
  const [form, setForm] = useState({
    name: '', city: '', state: 'SC', category: '' as PlaceCategory | '',
    description: '', mapsLink: '', photoUrl: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploadProgress(0)
    try {
      const url = await uploadToCloudinary(file, setUploadProgress)
      update('photoUrl', url)
    } catch {
      alert('Erro ao fazer upload da foto. Tente novamente.')
      setPreview(null)
    } finally {
      setUploadProgress(null)
    }
  }

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
        body: JSON.stringify({ ...form, suggestedBy: user?.uid || 'anon' }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Recebemos sua sugestão!</h2>
        <p className="text-gray-500">A gente analisa e publica em breve. Valeu por ajudar a galera a descobrir novos rolês!</p>
        <button onClick={() => { setStatus('idle'); setForm({ name: '', city: '', state: 'SC', category: '', description: '', mapsLink: '', photoUrl: '' }); setPreview(null) }}
          className="btn-primary mt-6 w-full">
          Sugerir outro lugar
        </button>
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

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link do Google Maps (opcional)</label>
          <input value={form.mapsLink} onChange={(e) => update('mapsLink', e.target.value)}
            placeholder="https://maps.google.com/..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Foto do lugar (opcional)</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />

          {preview ? (
            <div className="relative rounded-xl overflow-hidden h-44">
              <Image src={preview} alt="Preview" fill className="object-cover" />
              {uploadProgress !== null && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                  <div className="w-3/4 h-2 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="text-white text-sm mt-2">{uploadProgress}%</span>
                </div>
              )}
              {uploadProgress === null && (
                <button type="button" onClick={() => { setPreview(null); update('photoUrl', '') }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">
                  ✕
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors">
              <span className="text-3xl">📷</span>
              <span className="text-sm">Toca para adicionar uma foto</span>
            </button>
          )}
        </div>

        {status === 'error' && (
          <p className="text-red-500 text-sm">Ops, deu erro ao enviar. Tenta de novo!</p>
        )}

        <button type="submit" disabled={status === 'sending' || !form.category} className="btn-primary" style={{ opacity: !form.category ? 0.7 : 1 }}>
          {status === 'sending' ? 'Enviando...' : '🙌 Enviar sugestão'}
        </button>
      </form>
    </div>
  )
}
