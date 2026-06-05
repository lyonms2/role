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

      <div className="max-w-3xl mx-auto px-8 py-10 text-gray-800">

        {/* Capa */}
        <div className="text-center mb-16 pb-10 border-b-2 border-orange-200">
          <div className="text-7xl mb-4">🗺️</div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">LetsApp</h1>
          <p className="text-xl text-orange-500 font-semibold mb-6">Descubra o que tem pertinho de você</p>
          <p className="text-gray-400 text-sm">Manual do Usuário — versão completa</p>
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
              'Explorar',
              'Perfil',
              'Sugerir um Lugar',
              'Anunciar no LetsApp',
              'Perguntas Frequentes',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 1 */}
        <Section id="1" title="1. O que é o LetsApp?" emoji="🗺️">
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
            <p className="text-sm mb-2">O calendário fica no topo da aba Roteiros. Para agendar:</p>
            <Steps steps={[
              'Toque em "📅 Agendar" no card do roteiro',
              'O roteiro fica selecionado (botão fica laranja)',
              'Toque num dia no calendário para marcar uma data',
              'Para marcar um período, toque no primeiro e depois no último dia',
              'Toque em "📅 Agendado ✕" para remover a data sem precisar abrir o calendário',
            ]} />
            <InfoBox>Cada roteiro tem uma cor diferente no calendário para você visualizar vários passeios de uma vez.</InfoBox>
          </SubSection>

          <SubSection title="Editando um roteiro">
            <p className="text-sm mb-2">Quer trocar um restaurante ou adicionar uma hospedagem? Abra os detalhes do roteiro no perfil, toque em <strong>✏️ Editar</strong> e você volta para a tela de montagem com tudo já preenchido.</p>
          </SubSection>

          <SubSection title="Publicando e compartilhando roteiros">
            <p className="text-sm mb-3">Quando seu roteiro estiver pronto, você pode publicá-lo para que outros usuários descubram. Abra os detalhes do roteiro e toque no botão de compartilhamento:</p>
            <Table
              headers={['Estado do botão', 'O que acontece']}
              rows={[
                ['📤 Publicar e compartilhar', 'Publica na comunidade e já copia o link para você colar onde quiser'],
                ['🔗 Copiar link', 'Roteiro já publicado — copia o link novamente'],
                ['📤 Roteiro copiado', 'Roteiros copiados de outros usuários não podem ser republicados'],
              ]}
            />
            <InfoBox>O link funciona mesmo que você edite ou exclua o roteiro original — a versão publicada fica independente!</InfoBox>
          </SubSection>

          <SubSection title="Gerenciando seus roteiros publicados">
            <p className="text-sm mb-2">Na seção <strong>📤 Compartilhados</strong>, no final da aba Roteiros, você vê tudo que publicou:</p>
            <ul className="space-y-1 text-sm">
              <li><strong>Ver →</strong> — Abre a página pública do roteiro (a mesma que outros usuários veem)</li>
              <li><strong>🔗</strong> — Copia o link para compartilhar pelo WhatsApp, Instagram, etc.</li>
              <li><strong>🗑️</strong> — Remove o roteiro da comunidade</li>
            </ul>
          </SubSection>

          <SubSection title="Descobrindo roteiros de outros usuários">
            <p className="text-sm mb-2">Você pode se inspirar em roteiros que a comunidade criou:</p>
            <ul className="space-y-2 text-sm">
              <li>🗓️ <strong>Tela Roteiro</strong> — Quando você não tem destino selecionado, a tela exibe "Roteiros da comunidade" com filtro por cidade</li>
              <li>📍 <strong>Página de um destino</strong> — Toque em "🗓️ Ver roteiros da comunidade" para ver roteiros para aquele lugar específico</li>
            </ul>
            <p className="text-sm mt-3 mb-2">Em cada roteiro da comunidade você pode:</p>
            <Table
              headers={['Ação', 'O que faz']}
              rows={[
                ['Ver detalhes →', 'Abre a página completa do roteiro com todos os lugares'],
                ['📋 Copiar', 'Salva o roteiro no seu perfil para você adaptar'],
                ['⭐ Avaliar', 'Dá uma nota para o roteiro e deixa um comentário'],
                ['🚩 Denunciar', 'Reporta um roteiro inadequado para a equipe analisar'],
              ]}
            />
            <InfoBox>Roteiros que você copia ficam no seu perfil para editar à vontade. Mas não podem ser republicados na comunidade.</InfoBox>
          </SubSection>
        </Section>

        <div className="page-break" />

        {/* 11 */}
        <Section id="11" title="11. Explorar" emoji="✨">
          <p className="text-sm mb-3">A aba <strong>Explorar</strong> reúne tudo em um só lugar, sem precisar buscar por localização:</p>
          <Table
            headers={['Seção', 'O que você encontra']}
            rows={[
              ['🎭 Shows & Eventos', 'Todos os eventos da plataforma'],
              ['🍽️ Onde Comer', 'Restaurantes, bares e cafés cadastrados'],
              ['🏡 Onde Dormir', 'Hotéis, pousadas e hospedagens'],
              ['🚗 Alugar Veículo', 'Comparador de aluguel de carros'],
            ]}
          />
        </Section>

        {/* 12 */}
        <Section id="12" title="12. Perfil" emoji="👤">
          <SubSection title="Seu painel de estatísticas">
            <Table
              headers={['Card', 'O que significa']}
              rows={[
                ['Roteiros', 'Quantos roteiros você já salvou'],
                ['Roteiros', 'Quantos roteiros você salvou'],
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
          <SubSection title="Status das sugestões">
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

        {/* 13 */}
        <Section id="13" title="13. Sugerir um Lugar" emoji="📝">
          <p className="text-sm mb-4">Conhece um lugar incrível que não está no app? Cadastre e ajude a comunidade a descobrir!</p>
          <SubSection title="É fácil — só 3 etapas">
            <div className="space-y-3">
              <StepBlock number="1" title="Qual é o rolê?">
                Escolha a categoria (praia, cachoeira, parque...), dê um nome e informe a cidade.
              </StepBlock>
              <StepBlock number="2" title="Onde fica?">
                Toque em <strong>🗺️ Abrir Maps</strong> para encontrar o lugar, depois escolha como quer informar a localização — são 3 opções:
              </StepBlock>
            </div>
            <Table
              headers={['Modo', 'Como usar']}
              rows={[
                ['🔗 Link Maps', 'Abra o Maps, encontre o lugar, toque em "Compartilhar" e cole o link aqui'],
                ['🌐 Coordenadas', 'No Maps, toque e segure em qualquer ponto — as coordenadas aparecem no topo. Cole no formato -27.1234, -48.5678'],
                ['📍 Plus Code', 'No Maps, toque sobre o lugar — o Plus Code (ex: 7RXJ+GH) aparece embaixo. Cole e toque em Buscar'],
              ]}
            />
            <div className="space-y-3 mt-3">
              <StepBlock number="3" title="Convence a galera!">
                Envie até 3 fotos e escreva uma descrição de pelo menos 30 caracteres contando por que vale a pena ir. Se quiser, adicione um vídeo do YouTube.
              </StepBlock>
            </div>
          </SubSection>
          <InfoBox>Sua sugestão passa por aprovação da equipe antes de aparecer no app. Você acompanha o status em Perfil → Sugestões. Se for rejeitada, você receberá uma notificação no app com o motivo.</InfoBox>
        </Section>

        <div className="page-break" />

        {/* 14 */}
        <Section id="14" title="14. Anunciar no LetsApp" emoji="📣">
          <p className="text-sm mb-4">Tem um negócio na área? Divulgue para quem está planejando visitar a região!</p>
          <SubSection title="Informar a localização">
            <p className="text-sm mb-2">Em todos os formulários de anúncio, toque em <strong>🗺️ Abrir Maps</strong> e escolha um dos 3 modos para informar onde fica:</p>
            <Table
              headers={['Modo', 'Como usar']}
              rows={[
                ['🔗 Link Maps', 'Compartilhe o link direto do Google Maps'],
                ['🌐 Coordenadas', 'Cole as coordenadas no formato -27.1234, -48.5678'],
                ['📍 Plus Code', 'Cole o código curto do Maps (ex: 7RXJ+GH) e toque em Buscar'],
              ]}
            />
          </SubSection>
          <SubSection title="🎭 Evento">
            <Table
              headers={['Campo', 'Obrigatório?']}
              rows={[
                ['Nome, cidade, categoria e descrição', '✅ Sim'],
                ['Localização (link, coordenadas ou Plus Code)', '✅ Sim'],
                ['Data, horário e preço', '✅ Sim'],
                ['Foto ou cartaz do evento', '✅ Sim'],
                ['Contato (nome e e-mail)', '✅ Sim'],
                ['Link para compra de ingressos', 'Opcional'],
              ]}
            />
          </SubSection>
          <SubSection title="🍽️ Restaurante / 🏡 Hospedagem">
            <Table
              headers={['Campo', 'Obrigatório?']}
              rows={[
                ['Nome, cidade, categoria e descrição', '✅ Sim'],
                ['Localização (link, coordenadas ou Plus Code)', '✅ Sim'],
                ['Contato (nome e e-mail)', '✅ Sim'],
                ['Fotos do lugar (até 3)', 'Opcional'],
                ['Redes sociais ou link de reserva', 'Opcional'],
              ]}
            />
          </SubSection>
        </Section>

        {/* 15 */}
        <Section id="15" title="15. Perguntas Frequentes" emoji="❓">
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
                'Se eu excluir meu roteiro, o link compartilhado para de funcionar?',
                'Não! Quando você publica um roteiro, uma cópia independente é criada na comunidade. O link continua funcionando normalmente até você mesmo excluir da seção Compartilhados no seu perfil.',
              ],
              [
                'Posso editar um roteiro depois de publicar?',
                'A versão publicada é uma foto do momento em que você publicou — editar o roteiro original não atualiza o que está na comunidade. Para atualizar, exclua da seção Compartilhados e publique novamente.',
              ],
              [
                'Posso publicar um roteiro que copiei de outro usuário?',
                'Não. Roteiros copiados são para uso pessoal. Só roteiros criados por você podem ser publicados na comunidade.',
              ],
              [
                'Como excluo minha avaliação?',
                'Acesse Perfil → Reviews, encontre a avaliação e toque no ícone 🗑️. A exclusão é imediata.',
              ],
              [
                'Minha sugestão foi rejeitada. Por quê?',
                'Os motivos mais comuns são: lugar já cadastrado, informações insuficientes, fotos de baixa qualidade ou fora do escopo do app (o LetsApp foca em destinos de lazer e bate-volta). Quando isso acontece, você recebe uma notificação no app com o motivo explicado pela equipe — fique de olho no banner vermelho no topo do Perfil.',
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
          <div className="text-4xl mb-3">🗺️</div>
          <p className="font-bold text-gray-900">LetsApp</p>
          <p className="text-orange-500 text-sm mt-1">Descubra o que tem pertinho de você</p>
          <p className="text-gray-400 text-xs mt-3">Dúvidas não respondidas aqui? Fale com a gente pelo app.</p>
        </div>

      </div>
    </div>
  )
}

function Section({ id, title, emoji, children }: { id: string; title: string; emoji: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
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
