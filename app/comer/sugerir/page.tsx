'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { addEat } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { EatCategory, Eat } from '@/types'
import { EAT_CATEGORY_LABELS } from '@/types'

const CATEGORIES = Object.keys(EAT_CATEGORY_LABELS) as EatCategory[]
const PRICE_RANGES: Eat['priceRange'][] = ['💲', '💲💲', '💲💲💲']
const PRICE_LABELS: Record<Eat['priceRange'], string> = {
  '💲': '💲 Baratinho',
  '💲💲': '💲💲 Médio',
  '💲💲💲': '💲💲💲 Caprichado',
}

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

export default function SugerirComerPage() {
  const [form, setForm] = useState({
    name: '',
    city: '',
    state: 'SC',
    category: '' as EatCategory | '',
    priceRange: '' as Eat['priceRange'] | '',
    description: '',
    mapsLink: '',
  })
  const [photo, setPhoto] = useState<string>('')
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setUploading(true)
    setUploadProgress(0)
    try {
      const url = await uploadToCloudinary(file, setUploadProgress)
      setPhoto(url)
    } catch {
      setPhotoPreview('')
      alert('Deu ruim no upload. Tenta de novo!')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category) { alert('Escolhe o tipo do lugar.'); return }
    if (!form.priceRange) { alert('Escolhe a faixa de preço.'); return }
    if (form.description.length < 30) { alert('Conta mais sobre o lugar! Mínimo 30 caracteres.'); return }

    setStatus('sending')
    try {
      const user = auth.currentUser
      await addEat({
        name: form.name,
        city: form.city,
        state: form.state,
        category: form.category as EatCategory,
        priceRange: form.priceRange as Eat['priceRange'],
        description: form.description,
        mapsLink: form.mapsLink || undefined,
        photoUrl: photo || undefined,
        suggestedBy: user?.uid || 'anon',
        status: 'pending',
      })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setForm({ name: '', city: '', state: 'SC', category: '', priceRange: '', description: '', mapsLink: '' })
    setPhoto('')
    setPhotoPreview('')
  }

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedida enviada!</h2>
        <p className="text-gray-500">A gente analisa e publica em breve. Valeu por ajudar a galera a comer bem!</p>
        <div className="flex flex-col gap-3 mt-6">
          <button onClick={reset} className="btn-primary w-full">Indicar outro lugar</button>
          <Link href="/comer" className="text-sm text-gray-400 text-center block">← Voltar para Onde Comer</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link href="/comer" className="text-sm text-gray-400 mb-4 inline-block">← Onde Comer</Link>

      <div className="text-center mb-7">
        <div className="text-4xl mb-2">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900">Indicar um lugar</h1>
        <p className="text-gray-500 mt-1">Conhece um lugar bom? Cola a dica pra galera não errar!</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4">

        {/* Nome */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do lugar *</label>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)}
            placeholder="Ex: Restaurante da Vó Maria"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
        </div>

        {/* Cidade + Estado */}
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

        {/* Tipo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de lugar *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => update('category', cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  form.category === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {EAT_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Faixa de preço */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Faixa de preço *</label>
          <div className="flex gap-2">
            {PRICE_RANGES.map((p) => (
              <button key={p} type="button" onClick={() => update('priceRange', p)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all flex flex-col items-center gap-0.5 ${
                  form.priceRange === p ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                <span>{PRICE_LABELS[p].split(' ')[0]}</span>
                <span className="text-xs opacity-80">{PRICE_LABELS[p].split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Descrição * <span className="text-gray-400 font-normal">({form.description.length}/30 mín.)</span>
          </label>
          <textarea required value={form.description} onChange={(e) => update('description', e.target.value)}
            rows={3} placeholder="O que é especial aqui? Tem algum prato obrigatório? Vale muito a pena?"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
        </div>

        {/* Google Maps */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Link do Google Maps <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input value={form.mapsLink} onChange={(e) => update('mapsLink', e.target.value)}
            placeholder="https://maps.google.com/..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
        </div>

        {/* Foto */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Foto do lugar <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                  <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="text-white text-xs mt-1">{uploadProgress}%</span>
                </div>
              )}
              {!uploading && (
                <button type="button" onClick={() => { setPhoto(''); setPhotoPreview(''); if (fileRef.current) fileRef.current.value = '' }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">
                  ✕
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors">
              <span className="text-3xl">📸</span>
              <span className="text-sm">Adicionar foto</span>
            </button>
          )}
        </div>

        {status === 'error' && (
          <p className="text-red-500 text-sm">Poxa, deu ruim ao enviar. Tenta de novo!</p>
        )}

        <button type="submit"
          disabled={status === 'sending' || !form.category || !form.priceRange || uploading}
          className="btn-primary"
          style={{ opacity: (!form.category || !form.priceRange || uploading) ? 0.7 : 1 }}>
          {status === 'sending' ? 'Enviando...' : '🍽️ Indicar esse lugar'}
        </button>

      </form>
    </div>
  )
}
