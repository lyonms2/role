'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createSession, joinSession } from '@/lib/realtimeDb'

type Mode = 'menu' | 'create' | 'join'

export default function RastrearPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [mode, setMode] = useState<Mode>('menu')
  const [sessionName, setSessionName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setLoading(true); setError('')
    try {
      const c = await createSession(sessionName, user!.uid, user!.displayName!, user?.photoURL ?? undefined)
      router.push(`/rastrear/${c}`)
    } catch { setError('Erro ao criar sessão. Verifique sua conexão.') }
    finally { setLoading(false) }
  }

  async function handleJoin() {
    const c = code.trim().toUpperCase()
    if (c.length < 6) { setError('Código inválido.'); return }
    setLoading(true); setError('')
    try {
      const ok = await joinSession(c, user!.uid, user!.displayName!, user?.photoURL ?? undefined)
      if (!ok) { setError('Sessão não encontrada ou expirada.'); setLoading(false); return }
      router.push(`/rastrear/${c}`)
    } catch { setError('Erro ao entrar na sessão.') }
    finally { setLoading(false) }
  }

  function back() { setMode('menu'); setError('') }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gray-400 mb-6 inline-block">← Início</Link>

      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📡</div>
        <h1 className="text-2xl font-bold text-gray-900">Rastrear grupo</h1>
        <p className="text-gray-500 mt-1 text-sm">Veja onde cada membro está em tempo real</p>
      </div>

      {mode === 'menu' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode('create')}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-orange-100 bg-orange-50 text-left hover:border-orange-300 transition-colors"
          >
            <span className="text-3xl">➕</span>
            <div>
              <p className="font-bold text-gray-900">Criar sessão</p>
              <p className="text-sm text-gray-500">Gera um código para compartilhar com o grupo</p>
            </div>
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-blue-100 bg-blue-50 text-left hover:border-blue-300 transition-colors"
          >
            <span className="text-3xl">🔗</span>
            <div>
              <p className="font-bold text-gray-900">Entrar com código</p>
              <p className="text-sm text-gray-500">Use o código compartilhado pelo líder</p>
            </div>
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nome do grupo <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Ex: Trilha da Serra de SC"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-white text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Criando...' : '➕ Criar sessão'}
          </button>
          <button onClick={back} className="text-sm text-gray-400 text-center">← Voltar</button>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Código do grupo</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: TRILH3"
              maxLength={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-center focus:outline-none focus:border-blue-400"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading || code.trim().length < 6}
            className="w-full py-4 rounded-xl font-bold text-white text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : '🔗 Entrar no grupo'}
          </button>
          <button onClick={back} className="text-sm text-gray-400 text-center">← Voltar</button>
        </div>
      )}

      <div className="mt-8 bg-gray-50 rounded-2xl p-4 text-xs text-gray-400 text-center space-y-1">
        <p>📱 Mantenha o app aberto para atualização contínua</p>
        <p>🕐 A sessão expira automaticamente após 24h</p>
      </div>
    </div>
  )
}
