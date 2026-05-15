'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Timestamp } from 'firebase/firestore'
import { auth } from '@/lib/firebase'
import { addEvent } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'
import type { EventCategory } from '@/types'
import { EVENT_CATEGORY_LABELS } from '@/types'

const CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

export default function SugerirEventoPage() {
  const [form, setForm] = useState({
    name: '',
    city: '',
    state: 'SC',
    category: '' as EventCategory | '',
    venue: '',
    date: '',
    endDate: '',
    price: '',
    description: '',
    ticketUrl: '',
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
    if (!form.category) { alert('Escolhe uma categoria pra o evento.'); return }
    if (!form.date) { alert('Coloca a data do evento.'); return }
    if (form.description.length < 30) { alert('Conta mais sobre o evento! Mínimo 30 caracteres.'); return }

    setStatus('sending')
    try {
      const user = auth.currentUser
      await addEvent({
        name: form.name,
        city: form.city,
        state: form.state,
        category: form.category as EventCategory,
        venue: form.venue,
        date: Timestamp.fromDate(new Date(form.date + 'T12:00:00')),
        endDate: form.endDate ? Timestamp.fromDate(new Date(form.endDate + 'T12:00:00')) : undefined,
        price: form.price || undefined,
        description: form.description,
        ticketUrl: form.ticketUrl || undefined,
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
    setForm({ name: '', city: '', state: 'SC', category: '', venue: '', date: '', endDate: '', price: '', description: '', ticketUrl: '' })
    setPhoto('')
    setPhotoPreview('')
  }

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🎭</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Evento registrado!</h2>
        <p className="text-gray-500">A gente analisa e publica em breve. Valeu por movimentar a agenda da galera!</p>
        <div className="flex flex-col gap-3 mt-6">
          <button onClick={reset} className="btn-primary w-full">Sugerir outro evento</button>
          <Link href="/eventos" className="text-sm text-gray-400 text-center block">← Voltar para Eventos</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link href="/eventos" className="text-sm text-gray-400 mb-4 inline-block">← Eventos</Link>

      <div className="text-center mb-7">
        <div className="text-4xl mb-2">🎭</div>
        <h1 className="text-2xl font-bold text-gray-900">Sugerir um evento</h1>
        <p className="text-gray-500 mt-1">Movimenta a agenda! Conta pra galera o que tá rolando.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4">

        {/* Nome */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do evento *</label>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)}
            placeholder="Ex: Festival de Jazz de Joinville"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
        </div>

        {/* Cidade + Estado */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade *</label>
            <input required value={form.city} onChange={(e) => update('city', e.target.value)}
              placeholder="Ex: Joinville"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
          </div>
          <div className="w-24">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado *</label>
            <select required value={form.state} onChange={(e) => update('state', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-purple-400 bg-white">
              {ESTADOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de evento *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => update('category', cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  form.category === cat ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {EVENT_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Local */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Local / Venue *</label>
          <input required value={form.venue} onChange={(e) => update('venue', e.target.value)}
            placeholder="Ex: Centreventos Cau Hansen"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
        </div>

        {/* Datas */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data de início *</label>
            <input required type="date" value={form.date} onChange={(e) => update('date', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 bg-white" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Data de fim <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 bg-white" />
          </div>
        </div>

        {/* Ingresso */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Valor do ingresso <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input value={form.price} onChange={(e) => update('price', e.target.value)}
            placeholder="Ex: Gratuito · R$ 50 · A partir de R$ 30"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Descrição * <span className="text-gray-400 font-normal">({form.description.length}/30 mín.)</span>
          </label>
          <textarea required value={form.description} onChange={(e) => update('description', e.target.value)}
            rows={3} placeholder="Do que se trata? Quem vai se apresentar? O que não pode perder?"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 resize-none" />
        </div>

        {/* Link de ingresso */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Link para comprar ingresso <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input value={form.ticketUrl} onChange={(e) => update('ticketUrl', e.target.value)}
            placeholder="https://sympla.com.br/... ou https://ingressos.com/..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400" />
        </div>

        {/* Foto */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Foto do evento <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                  <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 transition-all" style={{ width: `${uploadProgress}%` }} />
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
              className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-purple-300 hover:text-purple-400 transition-colors">
              <span className="text-3xl">📸</span>
              <span className="text-sm">Adicionar foto</span>
            </button>
          )}
        </div>

        {status === 'error' && (
          <p className="text-red-500 text-sm">Poxa, deu ruim ao enviar. Tenta de novo!</p>
        )}

        <button type="submit"
          disabled={status === 'sending' || !form.category || uploading}
          className="btn-primary"
          style={{ background: (!form.category || uploading) ? '#a78bfa' : '#7c3aed' }}>
          {status === 'sending' ? 'Enviando...' : '🎭 Sugerir evento'}
        </button>

      </form>
    </div>
  )
}
