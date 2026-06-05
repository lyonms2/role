import Link from 'next/link'

const SECTIONS = [
  {
    href: '/eventos',
    emoji: '🎭',
    title: 'Shows & Eventos',
    description: 'Shows, festivais, feiras e tudo que tá rolando perto de você',
    gradient: 'from-purple-500 to-purple-700',
    badge: 'Agenda da galera',
  },
  {
    href: '/comer',
    emoji: '🍽️',
    title: 'Onde Comer',
    description: 'Restaurantes, bares, cafés e pedidas da galera local',
    gradient: 'from-orange-400 to-orange-600',
    badge: 'Curadoria local',
  },
  {
    href: '/hospedar',
    emoji: '🏡',
    title: 'Onde Dormir',
    description: 'Pousadas, hotéis, camping e o lugar certo pra descansar',
    gradient: 'from-green-500 to-green-700',
    badge: 'Todas as opções',
  },
]

const CONTRIBUTIONS = [
  { href: '/sugerir',              emoji: '📍', label: 'Sugerir destino',     description: 'Praias, cachoeiras, trilhas e mais' },
  { href: '/sugerir?tipo=comer',   emoji: '🍽️', label: 'Sugerir restaurante', description: 'Indique um lugar pra comer' },
  { href: '/sugerir?tipo=hospedar',emoji: '🏡', label: 'Sugerir hospedagem',  description: 'Pousada, hotel ou camping' },
  { href: '/eventos/sugerir',      emoji: '🎭', label: 'Divulgar evento',      description: 'Show, feira ou festival' },
]

export default function ExplorarPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">

      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">Explorar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tudo que você precisa pra montar o rolê perfeito</p>
      </div>

      {/* Seções principais */}
      <div className="flex flex-col gap-3 mb-8">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group block rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all"
          >
            <div className={`bg-gradient-to-r ${s.gradient} px-5 py-4 flex items-center gap-4`}>
              <span className="text-3xl">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base leading-tight">{s.title}</p>
                <p className="text-white/80 text-xs mt-0.5">{s.description}</p>
              </div>
              <span className="text-white/60 text-xl font-bold group-hover:translate-x-1 transition-transform flex-shrink-0">›</span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between bg-white">
              <span className="text-xs font-semibold text-gray-400">{s.badge}</span>
              <span className="text-xs text-orange-500 font-semibold">Ver todos →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Contribuir */}
      <div className="border-t border-gray-100 pt-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Contribuir com a comunidade</p>
        <p className="text-xs text-gray-400 mb-4">Nossa equipe revisa e publica gratuitamente</p>
        <div className="flex flex-col gap-2">
          {CONTRIBUTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-colors"
            >
              <span className="text-xl flex-shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>
              <span className="text-orange-400 font-bold flex-shrink-0">→</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
