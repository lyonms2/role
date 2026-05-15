import Link from 'next/link'

const SECTIONS = [
  {
    href: '/eventos',
    emoji: '🎭',
    title: 'Shows & Eventos',
    description: 'Shows, festivais, feiras e tudo que tá rolando perto do seu destino',
    color: 'from-purple-500 to-purple-700',
    badge: 'Agenda da galera',
  },
  {
    href: '/comer',
    emoji: '🍽️',
    title: 'Onde Comer',
    description: 'Restaurantes, bares, cafés e pedidas da galera local',
    color: 'from-orange-400 to-orange-600',
    badge: 'Curadoria local',
  },
  {
    href: '/hospedar',
    emoji: '🏡',
    title: 'Onde Dormir',
    description: 'Pousadas, hotéis, camping e o lugar certo pra descansar depois do rolê',
    color: 'from-green-500 to-green-700',
    badge: 'Todas as opções',
  },
  {
    href: '/veiculos',
    emoji: '🚗',
    title: 'Alugar Veículo',
    description: 'Carro, moto, van ou bike — chegue no rolê do seu jeito',
    color: 'from-blue-500 to-blue-700',
    badge: 'Locais e nacionais',
  },
]

export default function ExplorarPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">✨</div>
        <h1 className="text-2xl font-bold text-gray-900">Explorar</h1>
        <p className="text-gray-500 mt-1">Tudo que você precisa pra montar o rolê perfeito</p>
      </div>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="card block overflow-hidden hover:shadow-md transition-shadow">
            <div className={`h-2 bg-gradient-to-r ${s.color}`} />
            <div className="p-5 flex items-start gap-4">
              <span className="text-4xl">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-gray-900 text-lg">{s.title}</h2>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {s.badge}
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
              </div>
              <span className="text-gray-300 text-lg mt-1">›</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center">
        <div className="text-3xl mb-2">🙌</div>
        <p className="font-semibold text-gray-800 text-sm">Conhece algum lugar incrível?</p>
        <p className="text-gray-500 text-xs mt-1 mb-3">A galera precisa saber! Sugere um rolê, evento, restaurante ou hospedagem.</p>
        <Link href="/sugerir" className="btn-primary inline-block text-sm px-6 py-2">
          ➕ Fazer uma sugestão
        </Link>
      </div>
    </div>
  )
}
