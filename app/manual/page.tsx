export const metadata = {
  title: 'Manual do Usuário — LetsApp',
}

export default function ManualPage() {
  return (
    <div className="manual-page">
      <style>{`
        @media print {
          header, nav, footer, .no-print { display: none !important; }
          .manual-page { padding: 0 !important; }
          body { background: white !important; }
          a { color: inherit !important; text-decoration: none !important; }
          .page-break { page-break-before: always; }
        }
        .manual-page { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10 text-gray-800 overflow-x-hidden">

        {/* Capa */}
        <div className="text-center mb-12 pb-10 border-b-2 border-orange-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo512x512.png" alt="LetsApp" className="h-24 w-auto mx-auto mb-4" />
          <p className="text-xl text-orange-500 font-semibold mb-6">Descubra o que tem pertinho de você</p>
          <p className="text-gray-400 text-sm">Manual do Usuário — versão completa</p>
        </div>

        {/* INÍCIO VISUAL — para quem não gosta de ler */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Começo rápido — leia só isso!</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3">
            {[
              { emoji: '🔍', title: 'Descubra', desc: 'Praias, cachoeiras, trilhas e parques perto de você' },
              { emoji: '⭐', title: 'Avalie', desc: 'Leia e escreva avaliações de quem já foi' },
              { emoji: '🗓️', title: 'Planeje', desc: 'Monte roteiros completos e salve no seu perfil' },
              { emoji: '📡', title: 'Rastreie', desc: 'Compartilhe localização em tempo real com seu grupo' },
              { emoji: '🎭', title: 'Eventos', desc: 'Shows, feiras e festivais na sua região' },
              { emoji: '📣', title: 'Divulgue', desc: 'Anuncie seu restaurante, pousada ou evento' },
            ].map((c) => (
              <div key={c.title} className="bg-orange-50 rounded-2xl p-4 text-center">
                <div className="text-3xl mb-2">{c.emoji}</div>
                <p className="font-bold text-gray-900 text-sm">{c.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-tight">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Mini guia visual */}
          <div className="bg-gray-900 rounded-2xl p-5 text-white">
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-3">Seu primeiro rolê em 3 toques</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { n: '1', text: 'Entre com Google' },
                { n: '2', text: 'Escolha o rolê' },
                { n: '3', text: 'Use sua localização' },
              ].map((s, i, arr) => (
                <div key={s.n} className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1.5">
                    <span className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{s.n}</span>
                    <span className="text-xs font-medium">{s.text}</span>
                  </div>
                  {i < arr.length - 1 && <span className="text-orange-400 font-bold text-xs">→</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Pronto! O app já mostra lugares perto de você. O resto do manual explica cada detalhe abaixo. 👇</p>
          </div>
        </div>

        {/* Índice */}
        <div className="mb-12 bg-orange-50 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Sumário</h2>
          <ol className="space-y-1.5 text-sm text-gray-700">
            {[
              'O que é o LetsApp?',
              'Seu primeiro rolê em 5 minutos',
              'Entrando no app',
              'Buscando lugares',
              'Página de um lugar',
              'Avaliando um lugar',
              'Onde Comer',
              'Onde Dormir',
              'Eventos',
              'Roteiro — Do básico ao avançado',
              '📡 Rastrear Grupo',
              'Explorar',
              'Perfil',
              'Sugerir um Lugar',
              'Anunciar no LetsApp',
              'Perguntas Frequentes',
            ].map((item, i) => (
              <li key={i}>
                <a href={`#s${i + 1}`} className="flex items-center gap-2 hover:text-orange-500 transition-colors group">
                  <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 group-hover:bg-orange-600 transition-colors">{i + 1}</span>
                  <span className="underline-offset-2 group-hover:underline">{item}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* 1 */}
        <Section id="1" title="1. O que é o LetsApp?" emoji="🧭">
          <p className="text-sm mb-4">
            O <strong>LetsApp</strong> é um aplicativo para você descobrir passeios, praias, cachoeiras, eventos, restaurantes e hospedagens <strong>perto de onde você está</strong> — tudo indicado e avaliado por pessoas reais da comunidade.
          </p>
          <p className="text-sm mb-4">
            Sabe quando bate aquela vontade de sair de casa mas você não sabe pra onde ir? É exatamente pra isso que o LetsApp existe.
          </p>
          <div className="bg-orange-50 rounded-2xl p-5 mb-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Com o LetsApp você pode:</p>
            <ul className="space-y-2 text-sm">
              {[
                ['🔍', 'Descobrir lugares de lazer a poucos quilômetros de você'],
                ['⭐', 'Ler e escrever avaliações de quem já foi'],
                ['🗓️', 'Montar um roteiro completo com onde comer, dormir e o que fazer'],
                ['📡', 'Rastrear a localização do grupo em tempo real durante o passeio'],
                ['📤', 'Compartilhar roteiros com amigos e família'],
                ['🎭', 'Acompanhar eventos e shows na sua região'],
              ].map(([emoji, text]) => (
                <li key={text as string} className="flex gap-2">
                  <span className="flex-shrink-0">{emoji}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <InfoBox>O LetsApp funciona no navegador do celular, computador ou tablet. Não precisa baixar nada da loja de aplicativos!</InfoBox>
        </Section>

        {/* 2 */}
        <Section id="2" title="2. Seu primeiro rolê em 5 minutos" emoji="⚡">
          <p className="text-sm mb-4">Nunca usou o app? Siga esse caminho rápido e já vai entender tudo:</p>
          <div className="space-y-3">
            <StepBlock number="1" title="Entre com sua conta Google">
              Não precisa criar conta nem senha. Só toque em "Entrar com Google" e escolha seu e-mail.
            </StepBlock>
            <StepBlock number="2" title="Escolha o tipo de rolê">
              Na tela inicial, selecione o que você quer: 🏖️ Praia, 🌿 Natureza, 🎡 Lazer, 🏛️ Histórico ou 🎭 Eventos.
            </StepBlock>
            <StepBlock number="3" title="Informe sua localização">
              Toque em "📍 Usar minha localização" — o app vai mostrar lugares perto de você automaticamente.
            </StepBlock>
            <StepBlock number="4" title="Toque em um lugar que chamou atenção">
              Veja fotos, avaliações, como chegar e muito mais.
            </StepBlock>
            <StepBlock number="5" title="Gostou? Monte seu roteiro!">
              Toque em "Montar roteiro →" para adicionar o destino e já começar a planejar o passeio.
            </StepBlock>
          </div>
          <InfoBox>Simples assim! Os próximos capítulos explicam cada parte em detalhes, no seu tempo.</InfoBox>
        </Section>

        {/* 3 */}
        <Section id="3" title="3. Entrando no app" emoji="🔑">
          <p className="text-sm mb-3">O LetsApp usa <strong>login com Google</strong> — a mesma conta que você já usa no Gmail, YouTube ou Google Maps.</p>
          <Steps steps={[
            'Abra o LetsApp no navegador',
            'Toque em "Entrar com Google"',
            'Escolha sua conta Google',
            'Pronto — você já está dentro!',
          ]} />
          <div className="mt-4 space-y-2">
            <p className="text-sm font-bold text-gray-700">Por que preciso entrar?</p>
            <p className="text-sm text-gray-600">Para poder salvar seus roteiros, escrever avaliações e sugerir lugares. Quem não está logado pode apenas visualizar.</p>
          </div>
          <InfoBox>Quer ter o LetsApp sempre à mão? No navegador do celular, toque em "Adicionar à tela inicial" — funciona como um app instalado, sem ocupar espaço.</InfoBox>
        </Section>

        <div className="page-break" />

        {/* 4 */}
        <Section id="4" title="4. Buscando lugares" emoji="🔍">
          <SubSection title="Passo 1 — Escolha o tipo de rolê">
            <Table
              headers={['Categoria', 'O que você encontra']}
              rows={[
                ['🏖️ Praia', 'Praias, lagoas e litoral'],
                ['🌿 Natureza', 'Cachoeiras, trilhas e matas'],
                ['🏛️ Histórico', 'Centros históricos, museus e ruínas'],
                ['🎡 Praças e Lazer', 'Parques, praças e diversão urbana'],
                ['🎭 Shows & Eventos', 'Shows, feiras e festivais'],
              ]}
            />
          </SubSection>
          <SubSection title="Passo 2 — Raio de busca">
            <p className="text-sm mb-2">Escolha o quão longe você quer ir:</p>
            <Table
              headers={['Raio', 'Ideal para']}
              rows={[
                ['10 km', 'Pertinho de casa, ir e voltar fácil'],
                ['25 km', 'Bate e volta tranquilo (opção padrão)'],
                ['40 km', 'Uma viagem curta de carro'],
                ['50 km', 'Fim de semana completo'],
              ]}
            />
          </SubSection>
          <SubSection title="Passo 3 — Sua localização">
            <ul className="space-y-2 text-sm">
              <li><strong>📍 Usar minha localização</strong> — O app detecta onde você está agora. Mais prático e preciso.</li>
              <li><strong>🗺️ Escolher no mapa</strong> — Toque em qualquer ponto do mapa. Útil para planejar uma viagem a outro lugar.</li>
              <li><strong>🔍 Buscar por cidade</strong> — Digite o nome da cidade (ex: Florianópolis, SC). O app completa automaticamente.</li>
            </ul>
          </SubSection>
          <SubSection title="Lendo os resultados">
            <ul className="space-y-2 text-sm">
              <li><strong>🗺️ Modo Mapa</strong> — Veja os lugares como marcadores no mapa. Ótimo para ter noção de distância.</li>
              <li><strong>📋 Modo Lista</strong> — Resultados organizados em seções: lugares da comunidade, sugestões do Google e eventos.</li>
            </ul>
            <Table
              headers={['Filtro', 'Para que serve']}
              rows={[
                ['📍 Dist.', 'Coloca o mais próximo primeiro'],
                ['⭐ Top', 'Coloca o mais bem avaliado primeiro'],
                ['👥 Comunidade', 'Mostra só os lugares cadastrados por usuários'],
              ]}
            />
          </SubSection>
        </Section>

        {/* 5 */}
        <Section id="5" title="5. Página de um lugar" emoji="📍">
          <p className="text-sm mb-4">Ao tocar em um lugar na lista ou no mapa, você abre a página completa com tudo que precisa saber antes de ir:</p>
          <ul className="space-y-2 text-sm list-none">
            {[
              ['📸', 'Fotos', 'Carrossel de fotos enviadas pela comunidade. Toque para ampliar.'],
              ['⭐', 'Avaliação', 'Nota média e total de avaliações de quem já visitou.'],
              ['🌤️', 'Clima agora', 'Temperatura e condição do tempo em tempo real naquele local.'],
              ['📶', 'Sinal de celular', 'Como é o sinal na região: Bom, Fraco ou Sem sinal.'],
              ['📍', 'Como chegar', 'Estimativa de quanto tempo leva e link direto para o Google Maps.'],
              ['🗓️', 'Montar roteiro', 'Adiciona esse destino ao seu roteiro de passeio.'],
              ['🗓️', 'Ver roteiros da comunidade', 'Roteiros de outros usuários que visitaram esse lugar.'],
              ['🚨', 'Segurança', 'Telefones de Polícia, Bombeiros e hospitais próximos.'],
              ['⭐', 'Avaliações', 'Lista completa de avaliações com fotos, badges e notas.'],
            ].map(([emoji, title, desc]) => (
              <li key={title as string} className="flex gap-2">
                <span className="flex-shrink-0">{emoji}</span>
                <span><strong>{title}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="page-break" />

        {/* 6 */}
        <Section id="6" title="6. Avaliando um lugar" emoji="⭐">
          <p className="text-sm mb-4">Sua avaliação ajuda outras pessoas a descobrirem lugares incríveis. Quanto mais detalhada, mais útil!</p>
          <SubSection title="Avaliações verificadas por GPS ✅">
            <p className="text-sm mb-2">Nos lugares cadastrados pela comunidade LetsApp, o app verifica se você realmente esteve lá:</p>
            <Steps steps={[
              'Toque em "⭐ Fui nesse rolê — avaliar"',
              'O app pede permissão para ver sua localização',
              'Se você estiver a menos de 5 km do lugar, pode avaliar',
              'Sua avaliação ganha o badge ✅ Verificado — mais confiável para todos!',
            ]} />
            <InfoBox>Não conseguiu a verificação? Tudo bem — você ainda pode avaliar, mas sem o badge de verificado.</InfoBox>
          </SubSection>
          <SubSection title="Gerenciar avaliações">
            <ul className="space-y-1 text-sm">
              <li>🗑️ Para <strong>excluir sua avaliação</strong>, acesse Perfil → Reviews e toque no ícone 🗑️</li>
              <li>🚩 Para <strong>denunciar uma avaliação</strong> de outro usuário, toque no ícone 🚩 na avaliação</li>
            </ul>
          </SubSection>
        </Section>

        {/* 7 */}
        <Section id="7" title="7. Onde Comer" emoji="🍽️">
          <p className="text-sm mb-3">Acesse pelo menu <strong>Explorar → Onde Comer</strong> ou dentro da tela de Roteiro.</p>
          <SubSection title="O que você pode avaliar">
            <Table
              headers={['Campo', 'Opções']}
              rows={[
                ['⭐ Nota geral', '1 a 5 estrelas'],
                ['🍽️ Qualidade da comida', 'Excelente / Boa / Ruim'],
                ['👥 Movimento', 'Tranquilo / Moderado / Lotado'],
                ['💲 Preço que você pagou', '💲 Barato / 💲💲 Médio / 💲💲💲 Caro'],
                ['📝 Comentário', 'Texto livre — conte o que achou!'],
                ['📸 Fotos', 'Até 3 fotos do lugar ou da comida'],
              ]}
            />
          </SubSection>
        </Section>

        {/* 8 */}
        <Section id="8" title="8. Onde Dormir" emoji="🏡">
          <p className="text-sm mb-3">Acesse pelo menu <strong>Explorar → Onde Dormir</strong> ou dentro da tela de Roteiro.</p>
          <SubSection title="O que você pode avaliar">
            <Table
              headers={['Campo', 'Opções']}
              rows={[
                ['⭐ Nota geral', '1 a 5 estrelas'],
                ['🧹 Limpeza', 'Impecável / Boa / Ruim'],
                ['🤝 Atendimento', 'Excelente / Bom / Ruim'],
                ['💲 Preço que você pagou', '💲 Barato / 💲💲 Médio / 💲💲💲 Caro'],
                ['👨‍👩‍👧 Bom para família?', 'Sim / Não'],
                ['📝 Comentário', 'Texto livre'],
                ['📸 Fotos', 'Até 3 fotos'],
              ]}
            />
          </SubSection>
        </Section>

        {/* 9 */}
        <Section id="9" title="9. Eventos" emoji="🎭">
          <p className="text-sm mb-3">Encontre shows, feiras e festivais pelo filtro <strong>🎭 Eventos</strong> na busca ou em <strong>Explorar → Shows & Eventos</strong>.</p>
          <SubSection title="O que você encontra na página do evento">
            <ul className="space-y-1 text-sm">
              <li>🖼️ <strong>Foto/cartaz</strong> do evento</li>
              <li>📅 <strong>Data, horário</strong> de início e fim</li>
              <li>📍 <strong>Local</strong> com link para o Google Maps</li>
              <li>💲 <strong>Preço</strong> do ingresso ou "Grátis"</li>
              <li>🎟️ <strong>Link para ingressos</strong> — abre o site de compras</li>
              <li>▶️ <strong>Vídeo do YouTube</strong> — quando disponível, assista direto no app</li>
            </ul>
          </SubSection>
          <SubSection title="O que você pode avaliar">
            <Table
              headers={['Campo', 'Opções']}
              rows={[
                ['⭐ Nota geral', '1 a 5 estrelas'],
                ['🎪 Organização', 'Ótima / Boa / Ruim'],
                ['👥 Movimento', 'Tranquilo / Moderado / Lotado'],
                ['💲 Custo-benefício', '💲 Bom / 💲💲 Regular / 💲💲💲 Caro'],
                ['👨‍👩‍👧 Bom para família?', 'Sim / Não'],
                ['📝 Comentário', 'Texto livre'],
                ['📸 Fotos', 'Até 3 fotos'],
              ]}
            />
          </SubSection>
          <InfoBox>O evento já acabou? Não tem problema — você ainda pode ler e escrever avaliações depois!</InfoBox>
        </Section>

        <div className="page-break" />

        {/* 10 */}
        <Section id="10" title="10. Roteiro — Do básico ao avançado" emoji="🗓️">
          <SubSection title="O que é um roteiro?">
            <p className="text-sm mb-3">Um roteiro é o seu planejamento de passeio dentro do app. Você escolhe um destino e vai adicionando onde vai comer, onde vai dormir e o que vai fazer — tudo num só lugar.</p>
            <p className="text-sm text-gray-500 italic">Exemplo: "Fim de semana em Garopaba" → destino Garopaba, restaurante Guna Hamburgueria, pousada Bartz House, evento Surfe Amador.</p>
          </SubSection>
          <SubSection title="Criando seu primeiro roteiro">
            <Steps steps={[
              'Encontre um destino na busca (praia, parque, etc.)',
              'Na página do lugar, toque em "🗓️ Montar roteiro →"',
              'O destino vira a base do seu roteiro',
              'Nas abas, adicione: 🎭 Eventos, 🍽️ Onde comer, 🏡 Onde dormir',
              'Toque em "🗓️ Salvar" na barra inferior — e pronto!',
            ]} />
            <InfoBox>Você precisa estar logado para salvar roteiros. Não se preocupe, o app avisa na hora.</InfoBox>
          </SubSection>
          <SubSection title="Seus roteiros salvos — Perfil → Roteiros">
            <p className="text-sm mb-2">Todos os seus roteiros ficam guardados no Perfil. Cada card mostra o destino, os itens salvos e as ações disponíveis:</p>
            <Table
              headers={['Botão', 'O que faz']}
              rows={[
                ['📅 Agendar', 'Abre o calendário para marcar a data do passeio'],
                ['📅 Agendado + ✕', 'Roteiro já tem data — toque no ✕ para remover rápido'],
                ['🗑️', 'Exclui o roteiro (pede confirmação)'],
              ]}
            />
          </SubSection>
          <SubSection title="Agendando no calendário">
            <Steps steps={[
              'Toque em "📅 Agendar" no card do roteiro',
              'O roteiro fica selecionado (botão fica laranja)',
              'Toque num dia no calendário para marcar uma data',
              'Para marcar um período, toque no primeiro e depois no último dia',
              'Toque em "📅 Agendado ✕" para remover a data sem precisar abrir o calendário',
            ]} />
            <InfoBox>Cada roteiro tem uma cor diferente no calendário para você visualizar vários passeios de uma vez.</InfoBox>
          </SubSection>
          <SubSection title="Publicando e compartilhando roteiros">
            <Table
              headers={['Estado do botão', 'O que acontece']}
              rows={[
                ['📤 Publicar e compartilhar', 'Publica na comunidade e já copia o link para você colar onde quiser'],
                ['🔗 Copiar link', 'Roteiro já publicado — copia o link novamente'],
                ['📤 Roteiro copiado', 'Roteiros copiados de outros usuários não podem ser republicados'],
              ]}
            />
          </SubSection>
          <SubSection title="Descobrindo roteiros de outros usuários">
            <ul className="space-y-2 text-sm">
              <li>🗓️ <strong>Tela Roteiro</strong> — Quando você não tem destino selecionado, a tela exibe "Roteiros da comunidade" com filtro por cidade</li>
              <li>📍 <strong>Página de um destino</strong> — Toque em "🗓️ Ver roteiros da comunidade" para ver roteiros para aquele lugar específico</li>
            </ul>
            <Table
              headers={['Ação', 'O que faz']}
              rows={[
                ['Ver detalhes →', 'Abre a página completa do roteiro com todos os lugares'],
                ['📋 Copiar', 'Salva o roteiro no seu perfil para você adaptar'],
                ['⭐ Avaliar', 'Dá uma nota para o roteiro e deixa um comentário'],
                ['🚩 Denunciar', 'Reporta um roteiro inadequado para a equipe analisar'],
              ]}
            />
          </SubSection>
        </Section>

        <div className="page-break" />

        {/* 11 — NOVO */}
        <Section id="11" title="11. Rastrear Grupo" emoji="📡">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-5">
            <p className="text-sm font-bold text-gray-900 mb-1">O que é isso?</p>
            <p className="text-sm text-gray-600">Uma forma de compartilhar a localização do grupo em tempo real durante o passeio. Todo mundo que entrar na sessão vê os outros no mapa ao vivo — ótimo para trilhas, praias movimentadas ou qualquer saída em grupo.</p>
          </div>

          <SubSection title="Criando uma sessão de rastreamento">
            <Steps steps={[
              'Acesse a tela Rastrear pelo seu Perfil ou pela tela Roteiro',
              'Toque em "Criar sessão"',
              'Dê um nome ao grupo (opcional — ex: "Trilha da Cascata")',
              'Um código de 6 letras é gerado automaticamente',
              'Compartilhe o código ou o link com seu grupo no WhatsApp',
            ]} />
          </SubSection>

          <SubSection title="Entrando numa sessão">
            <Steps steps={[
              'Toque no link que alguém compartilhou — você entra direto',
              'Ou acesse a tela Rastrear e toque em "Entrar com código"',
              'Digite o código de 6 letras e toque em Entrar',
            ]} />
            <InfoBox>Você precisa estar logado para usar o rastreamento. A sessão expira automaticamente após 24 horas.</InfoBox>
          </SubSection>

          <SubSection title="Na tela de rastreamento">
            <ul className="space-y-2 text-sm">
              <li>🗺️ <strong>Mapa ao vivo</strong> — Veja a posição de todos os membros do grupo em tempo real</li>
              <li>📍 <strong>Ativar GPS</strong> — Toque no botão no canto inferior direito para começar a transmitir sua localização</li>
              <li>🛰️ <strong>Satélite</strong> — Alterne entre mapa de ruas e visão de satélite pelo botão no cabeçalho</li>
              <li>📋 <strong>Código da sessão</strong> — Toque no código no canto superior direito para copiar o link e compartilhar</li>
              <li>👤 <strong>Avatares</strong> — Toque na foto de um membro no rodapé para o mapa voar até a posição dele</li>
            </ul>
            <Table
              headers={['Indicador', 'O que significa']}
              rows={[
                ['Tela acesa · GPS ativo', 'Seu dispositivo está transmitindo localização e a tela não vai apagar'],
                ['sem GPS', 'O membro ainda não ativou o rastreamento'],
                ['há Xmin', 'Há quanto tempo aquela posição foi atualizada'],
              ]}
            />
          </SubSection>

          <SubSection title="🆘 Botão SOS — Em caso de emergência">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
              <p className="text-sm font-bold text-red-700 mb-1">Como usar o SOS</p>
              <p className="text-sm text-red-600">Se alguém do grupo precisar de ajuda, segure o botão 🆘 no cabeçalho por <strong>2 segundos</strong>. Segure até a tela ficar vermelha e solte.</p>
            </div>
            <p className="text-sm mb-2">O que acontece quando o SOS é ativado:</p>
            <ul className="space-y-1 text-sm">
              <li>🔴 O pin daquela pessoa pisca em vermelho no mapa de todos</li>
              <li>🚨 Um banner vermelho aparece no topo com o nome de quem ativou</li>
              <li>📳 O dispositivo vibra para alertar</li>
              <li>✅ Para desativar, segure o botão 🆘 novamente por 2 segundos</li>
            </ul>
            <InfoBox>O SOS exige segurar por 2 segundos para evitar ativação acidental. Uma barra de progresso aparece na tela enquanto você segura.</InfoBox>
          </SubSection>
        </Section>

        {/* 12 */}
        <Section id="12" title="12. Explorar" emoji="✨">
          <p className="text-sm mb-3">A aba <strong>Explorar</strong> reúne tudo em um só lugar, sem precisar buscar por localização:</p>
          <Table
            headers={['Seção', 'O que você encontra']}
            rows={[
              ['🎭 Shows & Eventos', 'Todos os eventos da plataforma'],
              ['🍽️ Onde Comer', 'Restaurantes, bares e cafés cadastrados'],
              ['🏡 Onde Dormir', 'Hotéis, pousadas e hospedagens'],
            ]}
          />
          <SubSection title="Contribuir com a comunidade">
            <p className="text-sm mb-2">Na parte inferior do Explorar você encontra as opções para adicionar conteúdo:</p>
            <ul className="space-y-1 text-sm">
              <li>📝 <strong>Sugerir destino</strong> — Cadastre uma praia, cachoeira, trilha ou parque</li>
              <li>🍽️ <strong>Sugerir restaurante</strong> — Indique um bar, café ou food truck</li>
              <li>🏡 <strong>Sugerir hospedagem</strong> — Cadastre uma pousada, hotel ou camping</li>
              <li>📣 <strong>Divulgar evento</strong> — Publique um show, feira ou festival</li>
            </ul>
          </SubSection>
        </Section>

        {/* 13 */}
        <Section id="13" title="13. Perfil" emoji="👤">
          <SubSection title="Seu painel de estatísticas">
            <Table
              headers={['Card', 'O que significa']}
              rows={[
                ['Avaliações', 'Total de avaliações que você escreveu em todas as categorias'],
                ['Roteiros', 'Quantos roteiros você salvou (criados + copiados)'],
                ['Sugestões', 'Quantos lugares você sugeriu à comunidade'],
              ]}
            />
          </SubSection>
          <SubSection title="Abas do perfil">
            <ul className="space-y-3 text-sm">
              <li>
                <strong>🗓️ Roteiros</strong> — Todos os seus roteiros salvos, calendário de agendamento e a seção <strong>📤 Compartilhados</strong> com os roteiros que você publicou na comunidade.
              </li>
              <li>
                <strong>⭐ Reviews</strong> — Todas as avaliações que você escreveu, com opção de excluir cada uma.
              </li>
              <li>
                <strong>📝 Sugestões</strong> — Lugares que você sugeriu, com o status de cada um (em análise, aprovado ou rejeitado).
              </li>
              <li>
                <strong>📣 Anúncios</strong> — Solicitações de anúncio que você enviou.
              </li>
            </ul>
          </SubSection>
          <SubSection title="Acesso rápido ao Rastrear Grupo">
            <p className="text-sm">No seu Perfil há um botão <strong>📡 Rastrear grupo</strong> para criar ou entrar em uma sessão de rastreamento diretamente.</p>
          </SubSection>
          <SubSection title="Status das sugestões e anúncios">
            <Table
              headers={['Badge', 'O que significa']}
              rows={[
                ['⏳ Em análise', 'A equipe ainda vai revisar — aguarde!'],
                ['✅ Aprovado', 'O lugar foi publicado no app para todo mundo ver'],
                ['❌ Rejeitado', 'Não atendeu os critérios (lugar já cadastrado, fora de escopo, etc.)'],
              ]}
            />
            <InfoBox>Quando uma sugestão ou anúncio é rejeitado, você recebe uma notificação no app com o motivo. O aviso aparece como um banner vermelho no topo do seu Perfil — toque no ✕ para dispensar depois de ler.</InfoBox>
          </SubSection>
        </Section>

        <div className="page-break" />

        {/* 14 */}
        <Section id="14" title="14. Sugerir um Lugar" emoji="📝">
          <p className="text-sm mb-4">Conhece um lugar incrível que não está no app? Cadastre e ajude a comunidade a descobrir!</p>
          <SubSection title="É fácil — só 3 etapas">
            <div className="space-y-3 mb-3">
              <StepBlock number="1" title="Qual é o rolê?">
                Escolha a categoria (praia, cachoeira, parque...), dê um nome e informe a cidade com autocomplete.
              </StepBlock>
              <StepBlock number="2" title="Onde fica? — Mapa interativo">
                Um mapa abre direto na cidade que você escolheu. <strong>Toque no local exato</strong> para marcar o ponto. Você também pode:
              </StepBlock>
            </div>
            <ul className="space-y-1 text-sm ml-10 mb-3">
              <li>📡 <strong>Minha localização</strong> — centraliza o mapa no seu GPS atual</li>
              <li>🌐 <strong>Coordenadas</strong> — cole as coordenadas (-27.1234, -48.5678) para ir direto ao ponto</li>
              <li>📍 <strong>Plus Code</strong> — cole o código curto do Maps (ex: 7RXJ+GH) e o mapa vai até lá</li>
              <li>🛰️ <strong>Satélite</strong> — alterne entre mapa de ruas e visão aérea para localizar melhor</li>
            </ul>
            <div className="space-y-3">
              <StepBlock number="3" title="Convence a galera!">
                Envie até 3 fotos e escreva uma descrição de pelo menos 30 caracteres contando por que vale a pena ir. Se quiser, adicione um link de vídeo do YouTube.
              </StepBlock>
            </div>
          </SubSection>
          <InfoBox>Sua sugestão passa por aprovação da equipe antes de aparecer no app. Você acompanha o status em Perfil → Sugestões. Se for rejeitada, você receberá uma notificação no app com o motivo.</InfoBox>
        </Section>

        {/* 15 */}
        <Section id="15" title="15. Anunciar no LetsApp" emoji="📣">
          <p className="text-sm mb-4">Tem um negócio na área? Divulgue para quem está planejando visitar a região!</p>

          <SubSection title="🎭 Divulgar Evento">
            <p className="text-sm mb-2">O wizard de eventos tem 4 etapas (5 se for plano pago):</p>
            <div className="space-y-2 mb-3">
              <StepBlock number="1" title="Tipo, nome e cidade">
                Escolha a categoria (Show, Festival, Feira...), dê o nome do evento e a cidade com autocomplete.
              </StepBlock>
              <StepBlock number="2" title="Quando acontece?">
                Data e horário de início, data e horário de encerramento e recorrência (único, semanal, mensal).
              </StepBlock>
              <StepBlock number="3" title="Onde fica? — Mapa interativo">
                Igual ao Sugerir: toque no mapa para marcar o local, ou use GPS, coordenadas e Plus Code.
              </StepBlock>
              <StepBlock number="4" title="Imagem e detalhes">
                Foto ou cartaz do evento, link de ingressos, link de vídeo do YouTube e descrição.
              </StepBlock>
            </div>
            <InfoBox>O link do Google Maps é gerado automaticamente a partir do ponto que você marcou no mapa — não precisa copiar nada do Maps.</InfoBox>
          </SubSection>

          <SubSection title="🍽️ Restaurante / 🏡 Hospedagem">
            <Table
              headers={['Campo', 'Obrigatório?']}
              rows={[
                ['Nome, cidade, categoria e descrição', '✅ Sim'],
                ['Localização no mapa', '✅ Sim'],
                ['Contato (nome e e-mail)', '✅ Sim'],
                ['Fotos do lugar (até 3)', 'Opcional'],
                ['Redes sociais ou link de reserva', 'Opcional'],
              ]}
            />
          </SubSection>

          <p className="text-sm mt-4 text-gray-600">Após o envio, você acompanha o status em <strong>Perfil → Anúncios</strong>. A equipe entra em contato para aprovação.</p>
        </Section>

        <div className="page-break" />

        {/* 16 */}
        <Section id="16" title="16. Perguntas Frequentes" emoji="❓">
          <div className="space-y-4">
            {[
              [
                'Preciso baixar o app de alguma loja?',
                'Não! O LetsApp abre direto no navegador do celular ou computador. Se quiser instalar, toque em "Adicionar à tela inicial" no navegador — ele vai aparecer como um ícone, igual a um app normal, sem ocupar espaço de armazenamento.',
              ],
              [
                'Preciso de internet para usar?',
                'Sim. O LetsApp busca informações em tempo real — lugares, clima, avaliações e rotas precisam de conexão com a internet.',
              ],
              [
                'Por que o app pede minha localização?',
                'Para mostrar os lugares mais perto de você primeiro. Você pode negar a permissão — nesse caso, basta digitar a cidade manualmente na busca.',
              ],
              [
                'Posso avaliar um lugar sem ter ido?',
                'Nos lugares da comunidade LetsApp, você pode avaliar sem estar lá, mas não recebe o badge ✅ Verificado. Nos lugares do Google, não há verificação de localização.',
              ],
              [
                'O rastreamento de grupo gasta muita bateria?',
                'O app usa o GPS do dispositivo continuamente, o que pode consumir bateria mais rápido. Para economizar, pause o rastreamento quando não precisar — toque em "Pausar" no botão do canto inferior direito do mapa.',
              ],
              [
                'A sessão de rastreamento fica aberta para sempre?',
                'Não. Toda sessão expira automaticamente após 24 horas e os dados são apagados. Se precisar de mais tempo, crie uma nova sessão.',
              ],
              [
                'Se eu excluir meu roteiro, o link compartilhado para de funcionar?',
                'Não! Quando você publica um roteiro, uma cópia independente é criada na comunidade. O link continua funcionando até você mesmo excluir da seção Compartilhados no seu perfil.',
              ],
              [
                'Como excluo minha avaliação?',
                'Acesse Perfil → Reviews, encontre a avaliação e toque no ícone 🗑️. A exclusão é imediata.',
              ],
              [
                'Minha sugestão foi rejeitada. Por quê?',
                'Os motivos mais comuns são: lugar já cadastrado, informações insuficientes, fotos de baixa qualidade ou fora do escopo do app. Quando isso acontece, você recebe uma notificação no app com o motivo explicado — fique de olho no banner vermelho no topo do Perfil.',
              ],
              [
                'Como denunciar uma avaliação ou roteiro inadequado?',
                'Nas avaliações, toque no ícone 🚩. Nos roteiros compartilhados, toque em "🚩 Denunciar roteiro". Nossa equipe analisa e toma as medidas necessárias.',
              ],
            ].map(([q, a]) => (
              <div key={q as string} className="border border-gray-100 rounded-xl p-4">
                <p className="font-semibold text-gray-900 text-sm mb-1">{q}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Rodapé */}
        <div className="mt-16 pt-8 border-t-2 border-orange-200 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo512x512.png" alt="LetsApp" className="h-14 w-auto mx-auto mb-3" />
          <p className="text-orange-500 text-sm mt-1">Descubra o que tem pertinho de você</p>
          <p className="text-gray-400 text-xs mt-3">Dúvidas não respondidas aqui? Fale com a gente pelo app.</p>
          <div className="flex items-center justify-center gap-3 mt-3 text-xs">
            <a href="/termos" className="text-orange-500 hover:underline">Termos de Uso</a>
            <span className="text-gray-300">·</span>
            <a href="/privacidade" className="text-orange-500 hover:underline">Política de Privacidade</a>
          </div>
        </div>

      </div>
    </div>
  )
}

function Section({ id, title, emoji, children }: { id: string; title: string; emoji: string; children: React.ReactNode }) {
  return (
    <section id={`s${id}`} className="mb-12 scroll-mt-20">
      <div className="flex items-center gap-3 mb-5 pb-2 border-b-2 border-orange-100">
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-1.5 mt-2">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  )
}

function StepBlock({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{number}</span>
      <div>
        <p className="font-semibold text-sm text-gray-900">{title}</p>
        <p className="text-sm text-gray-600 mt-0.5">{children}</p>
      </div>
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 leading-relaxed">
      💡 {children}
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-orange-50">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-gray-700 border border-orange-100 text-xs uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 border border-gray-100 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
