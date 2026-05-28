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
              'Primeiros Passos',
              'Tela Inicial — Descobrir',
              'Detalhes de um Destino',
              'Onde Comer',
              'Onde Dormir',
              'Eventos',
              'Avaliações',
              'Roteiro',
              'Explorar',
              'Perfil',
              'Sugerir um Lugar',
              'Anunciar no LetsApp',
              'Navegação',
              'Perguntas Frequentes',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <Section id="1" title="1. Primeiros Passos" emoji="👋">
          <SubSection title="Login">
            <p>O LetsApp usa <strong>login com Google</strong> — sem cadastro, sem senha.</p>
            <Steps steps={['Abra o app', 'Toque em "Entrar com Google"', 'Escolha sua conta Google', 'Pronto — você já está dentro!']} />
            <InfoBox>Por que precisa de login? Para salvar seus roteiros, publicar avaliações e sugerir lugares. Tudo fica associado à sua conta.</InfoBox>
          </SubSection>
        </Section>

        <Section id="2" title="2. Tela Inicial — Descobrir" emoji="🔍">
          <SubSection title="Passo 1 — Escolha o tipo de rolê">
            <Table
              headers={['Categoria', 'O que encontra']}
              rows={[
                ['🏖️ Praia', 'Praias, lagoas, litoral'],
                ['🌿 Natureza', 'Cachoeiras, matas, trilhas'],
                ['🏛️ Histórico', 'Centros históricos, museus, ruínas'],
                ['🎡 Praças e Lazer', 'Parques, praças, lazer urbano'],
                ['🎭 Shows & Eventos', 'Shows, feiras, festivais'],
              ]}
            />
          </SubSection>
          <SubSection title="Passo 2 — Raio de busca">
            <Table
              headers={['Raio', 'Ideal para']}
              rows={[
                ['10 km', 'Pertinho de casa'],
                ['25 km', 'Bate e volta tranquilo (padrão)'],
                ['40 km', 'Uma viagem curta'],
                ['50 km', 'Fim de semana'],
              ]}
            />
          </SubSection>
          <SubSection title="Passo 3 — Informe sua localização">
            <ul className="space-y-2 text-sm">
              <li><strong>📍 Usar minha localização</strong> — O app usa o GPS do seu dispositivo. Precisão máxima.</li>
              <li><strong>🗺️ Escolher no mapa</strong> — Toque em qualquer ponto para definir o ponto de partida.</li>
              <li><strong>🔍 Buscar por cidade</strong> — Digite o nome (ex: Florianópolis, SC). Autocomplete automático.</li>
            </ul>
          </SubSection>
          <SubSection title="Visualizando os resultados">
            <ul className="space-y-2 text-sm">
              <li><strong>🗺️ Modo Mapa</strong> — Marcadores no mapa com círculo de raio de busca.</li>
              <li><strong>📋 Modo Lista</strong> — Resultados em seções: Comunidade, Google Places e Eventos.</li>
            </ul>
            <Table
              headers={['Filtro', 'Função']}
              rows={[
                ['📍 Dist.', 'Ordena do mais próximo ao mais distante'],
                ['⭐ Top', 'Ordena pelos mais bem avaliados'],
                ['👥 Comunidade', 'Mostra só lugares dos usuários'],
                ['📍 Local', 'Marca um ponto diferente no mapa'],
              ]}
            />
          </SubSection>
        </Section>

        <Section id="3" title="3. Detalhes de um Destino" emoji="📍">
          <p className="text-sm mb-3">Ao tocar em um lugar, você vê a página completa com:</p>
          <ul className="space-y-1.5 text-sm list-none">
            {[
              ['📸', 'Fotos', 'Carrossel com lightbox. Toque para ampliar.'],
              ['⭐', 'Avaliação', 'Nota média e número de avaliações da comunidade.'],
              ['🌤️', 'Clima atual', 'Temperatura e condição em tempo real.'],
              ['📶', 'Sinal de celular', 'Agregado das avaliações: Bom / Fraco / Sem sinal.'],
              ['📍', 'Como chegar', 'Estimativa de tempo e link para o Google Maps.'],
              ['🗓️', 'Montar roteiro', 'Define este local como destino do seu roteiro.'],
              ['🚨', 'Segurança', 'Polícia, bombeiros e hospitais próximos com telefone.'],
              ['⭐', 'Avaliações', 'Lista de avaliações com fotos, badges e notas.'],
            ].map(([emoji, title, desc]) => (
              <li key={title} className="flex gap-2">
                <span className="flex-shrink-0">{emoji}</span>
                <span><strong>{title}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="page-break" />

        <Section id="4" title="4. Onde Comer" emoji="🍽️">
          <p className="text-sm mb-3">Acesse pelo menu <strong>Explorar → Onde Comer</strong>.</p>
          <SubSection title="Campos das avaliações">
            <Table
              headers={['Campo', 'Opções']}
              rows={[
                ['⭐ Nota', '1 a 5 estrelas'],
                ['🍽️ Qualidade da comida', 'Excelente / Boa / Ruim'],
                ['👥 Movimento', 'Tranquilo / Moderado / Lotado'],
                ['💲 Preço pago', '💲 / 💲💲 / 💲💲💲'],
                ['📝 Comentário', 'Texto livre'],
                ['📸 Fotos', 'Até 3 fotos'],
              ]}
            />
          </SubSection>
        </Section>

        <Section id="5" title="5. Onde Dormir" emoji="🏡">
          <p className="text-sm mb-3">Acesse pelo menu <strong>Explorar → Onde Dormir</strong>.</p>
          <SubSection title="Campos das avaliações">
            <Table
              headers={['Campo', 'Opções']}
              rows={[
                ['⭐ Nota', '1 a 5 estrelas'],
                ['🧹 Limpeza', 'Impecável / Boa / Ruim'],
                ['🤝 Atendimento', 'Excelente / Bom / Ruim'],
                ['💲 Preço pago', '💲 / 💲💲 / 💲💲💲'],
                ['👨‍👩‍👧 Bom pra família', 'Sim / Não'],
                ['📝 Comentário', 'Texto livre'],
                ['📸 Fotos', 'Até 3 fotos'],
              ]}
            />
          </SubSection>
        </Section>

        <Section id="6" title="6. Eventos" emoji="🎭">
          <p className="text-sm mb-3">Acesse pelo filtro <strong>🎭 Eventos</strong> na busca ou em <strong>Explorar → Shows & Eventos</strong>.</p>
          <SubSection title="Campos das avaliações">
            <Table
              headers={['Campo', 'Opções']}
              rows={[
                ['⭐ Nota', '1 a 5 estrelas'],
                ['🎪 Organização', 'Ótima / Boa / Ruim'],
                ['👥 Movimento', 'Tranquilo / Moderado / Lotado'],
                ['💲 Custo-benefício', '💲 / 💲💲 / 💲💲💲'],
                ['👨‍👩‍👧 Bom pra família', 'Sim / Não'],
                ['📝 Comentário', 'Texto livre'],
                ['📸 Fotos', 'Até 3 fotos'],
              ]}
            />
          </SubSection>
          <InfoBox>Evento encerrado? Você ainda pode ler e escrever avaliações mesmo depois do evento ter acontecido.</InfoBox>
        </Section>

        <Section id="7" title="7. Avaliações" emoji="⭐">
          <SubSection title="Avaliações verificadas por GPS ✅">
            <p className="text-sm mb-2">Nos destinos da <strong>comunidade LetsApp</strong>, as avaliações passam por verificação de localização:</p>
            <Steps steps={[
              'Toque em "⭐ Fui nesse rolê — avaliar"',
              'O app solicita acesso à sua localização',
              'Se você estiver a menos de 5 km do lugar, pode avaliar',
              'Sua avaliação ganha o badge ✅ Verificado',
            ]} />
            <InfoBox>Por que essa verificação? Para garantir que só quem foi de verdade possa avaliar. Isso torna as avaliações muito mais confiáveis!</InfoBox>
          </SubSection>
          <SubSection title="Gerenciar suas avaliações">
            <ul className="space-y-1 text-sm">
              <li>🗑️ <strong>Excluir</strong> sua própria avaliação — toque no ícone 🗑️</li>
              <li>🚩 <strong>Denunciar</strong> avaliação de outro usuário — toque no ícone 🚩</li>
            </ul>
          </SubSection>
        </Section>

        <div className="page-break" />

        <Section id="8" title="8. Roteiro" emoji="🗓️">
          <SubSection title="Como criar um roteiro">
            <Steps steps={[
              'Encontre um destino na busca',
              'Na página de detalhes, toque em "Montar roteiro →"',
              'O destino vira a base do seu roteiro',
              'Nas abas, adicione: 🎭 Eventos, 🍽️ Onde comer, 🏡 Onde dormir',
              'Toque em "Salvar roteiro" na barra inferior',
            ]} />
            <InfoBox>Login obrigatório para salvar roteiros.</InfoBox>
          </SubSection>
          <SubSection title="Agendar no calendário">
            <p className="text-sm mb-2">Em <strong>Perfil → Roteiros</strong>, toque em <strong>📅 Agendar</strong> no card do roteiro e selecione um dia no calendário.</p>
            <ul className="space-y-1 text-sm">
              <li>📅 <strong>Sem data</strong> — botão "📅 Agendar"</li>
              <li>📅 <strong>Com data</strong> — botão mostra "📅 Agendado" + <strong>✕</strong> para remover rapidamente</li>
              <li>🎨 Cada roteiro tem uma cor diferente para facilitar a visualização no calendário</li>
            </ul>
          </SubSection>
          <SubSection title="Publicar e compartilhar roteiros">
            <p className="text-sm mb-2">Ao abrir os detalhes de um roteiro no perfil, toque no botão para publicá-lo na comunidade:</p>
            <Table
              headers={['Estado do botão', 'Ação']}
              rows={[
                ['📤 Publicar e compartilhar', 'Publica o roteiro na comunidade e copia o link'],
                ['🔗 Copiar link', 'Roteiro já publicado — copia o link novamente'],
                ['📤 Roteiro copiado', 'Roteiros copiados de outros não podem ser publicados'],
              ]}
            />
            <InfoBox>Ao publicar, o roteiro aparece na seção "Roteiros da comunidade" e fica disponível pelo link mesmo se você editar ou excluir o original.</InfoBox>
          </SubSection>
          <SubSection title="Roteiros compartilhados (aba Roteiros)">
            <p className="text-sm mb-2">A seção <strong>📤 Compartilhados</strong> no final da aba Roteiros lista todos os roteiros que você publicou. Por lá você pode:</p>
            <ul className="space-y-1 text-sm">
              <li>👁️ <strong>Ver →</strong> — Abre a página pública do roteiro</li>
              <li>🔗 — Copia o link para compartilhar</li>
              <li>🗑️ — Remove o roteiro da comunidade (pede confirmação)</li>
            </ul>
          </SubSection>
          <SubSection title="Roteiros da comunidade">
            <p className="text-sm mb-2">Encontre roteiros de outros usuários em:</p>
            <ul className="space-y-1 text-sm">
              <li>🗓️ <strong>Tela Roteiro</strong> — Seção "Roteiros da comunidade" com filtro por cidade</li>
              <li>📍 <strong>Página de destino</strong> — Botão "🗓️ Ver roteiros da comunidade"</li>
            </ul>
            <p className="text-sm mt-2">Em cada card você pode <strong>Ver detalhes →</strong> (abre a página completa), <strong>📋 Copiar</strong> o roteiro para o seu perfil ou <strong>⭐ Avaliar</strong>.</p>
            <InfoBox>Roteiros copiados ficam no seu perfil para editar e adaptar. Roteiros que você copia não podem ser republicados.</InfoBox>
          </SubSection>
        </Section>

        <Section id="9" title="9. Explorar" emoji="✨">
          <Table
            headers={['Seção', 'O que você encontra']}
            rows={[
              ['🎭 Shows & Eventos', 'Todos os eventos próximos'],
              ['🍽️ Onde Comer', 'Restaurantes, bares e cafés'],
              ['🏡 Onde Dormir', 'Hotéis, pousadas e hospedagens'],
              ['🚗 Alugar Veículo', 'Comparador de aluguel de carros'],
            ]}
          />
        </Section>

        <Section id="10" title="10. Perfil" emoji="👤">
          <SubSection title="Estatísticas">
            <Table
              headers={['Card', 'O que conta']}
              rows={[
                ['Rolês', 'Total de avaliações escritas'],
                ['Roteiros', 'Roteiros salvos na sua conta'],
                ['Sugestões', 'Lugares que você sugeriu'],
              ]}
            />
          </SubSection>
          <SubSection title="Abas do perfil">
            <ul className="space-y-2 text-sm">
              <li><strong>🗓️ Roteiros</strong> — Lista, agenda e publica seus roteiros. Inclui a seção <strong>📤 Compartilhados</strong> com os roteiros publicados na comunidade.</li>
              <li><strong>⭐ Reviews</strong> — Todas as avaliações que você escreveu.</li>
              <li><strong>📝 Sugestões</strong> — Lugares que você sugeriu à comunidade.</li>
              <li><strong>📣 Anúncios</strong> — Solicitações de anúncio enviadas.</li>
            </ul>
          </SubSection>
          <SubSection title="Status das sugestões">
            <Table
              headers={['Badge', 'Significado']}
              rows={[
                ['⏳ Em análise', 'A equipe ainda não revisou'],
                ['✅ Aprovado', 'O lugar foi publicado no app!'],
                ['❌ Rejeitado', 'Não atendeu os critérios'],
              ]}
            />
          </SubSection>
        </Section>

        <Section id="11" title="11. Sugerir um Lugar" emoji="📝">
          <p className="text-sm mb-3">Contribua com a comunidade cadastrando destinos que você conhece!</p>
          <SubSection title="Formulário em 3 etapas">
            <div className="space-y-3">
              <StepBlock number="1" title="Qual é o rolê?">
                Categoria, nome do lugar e cidade com autocomplete.
              </StepBlock>
              <StepBlock number="2" title="Onde fica?">
                Cole o link do Google Maps (o app extrai as coordenadas automaticamente ✅) e, opcionalmente, um vídeo do YouTube.
              </StepBlock>
              <StepBlock number="3" title="Convence a galera!">
                Até 3 fotos e uma descrição de mínimo 50 caracteres.
              </StepBlock>
            </div>
          </SubSection>
        </Section>

        <div className="page-break" />

        <Section id="12" title="12. Anunciar no LetsApp" emoji="📣">
          <p className="text-sm mb-4">Divulgue seu negócio para quem está explorando a região!</p>
          <SubSection title="🎭 Evento">
            <Table
              headers={['Campo', 'Obrigatório']}
              rows={[
                ['Nome, cidade, categoria, descrição', '✅ Sim'],
                ['Link do Google Maps', '✅ Sim'],
                ['Data, horário e preço', '✅ Sim'],
                ['Foto/cartaz do evento', '✅ Sim'],
                ['Contato (nome, e-mail)', '✅ Sim'],
                ['Link para ingressos', '— Opcional'],
              ]}
            />
          </SubSection>
          <SubSection title="🍽️ Restaurante / 🏡 Hospedagem">
            <Table
              headers={['Campo', 'Obrigatório']}
              rows={[
                ['Nome, cidade, categoria, descrição', '✅ Sim'],
                ['Link do Google Maps', '✅ Sim'],
                ['Contato (nome, e-mail)', '✅ Sim'],
                ['Fotos (até 3)', '— Opcional'],
                ['Redes sociais / link de reserva', '— Opcional'],
              ]}
            />
          </SubSection>
        </Section>

        <Section id="13" title="13. Navegação" emoji="🧭">
          <SubSection title="Barra superior">
            <ul className="text-sm space-y-1">
              <li><strong>🗺️ LetsApp</strong> — Toque para voltar à tela inicial</li>
              <li><strong>Ícone de perfil</strong> — Acessa seu perfil</li>
            </ul>
          </SubSection>
          <SubSection title="Barra inferior">
            <Table
              headers={['Ícone', 'Tela']}
              rows={[
                ['🗺️ Descobrir', 'Tela principal de busca'],
                ['🗓️ Roteiro', 'Seu roteiro atual (ponto laranja = ativo)'],
                ['✨ Explorar', 'Categorias e anúncios'],
                ['👤 Perfil', 'Sua conta e histórico'],
              ]}
            />
          </SubSection>
        </Section>

        <Section id="14" title="14. Perguntas Frequentes" emoji="❓">
          <div className="space-y-4">
            {[
              ['Preciso de internet para usar o app?', 'Sim. O LetsApp busca dados em tempo real — lugares, clima, rotas e avaliações precisam de conexão.'],
              ['Por que meu GPS não funciona?', 'Verifique se você deu permissão de localização ao app nas configurações do navegador/dispositivo.'],
              ['Posso avaliar sem estar no lugar?', 'Nos destinos da comunidade, sim — mas sua avaliação não recebe o badge ✅ Verificado. Nos lugares do Google, não há verificação de localização.'],
              ['Como instalar o app no celular?', 'O LetsApp é um PWA. No navegador, toque em "Adicionar à tela inicial" para instalar sem precisar de loja de aplicativos.'],
              ['Minha sugestão foi rejeitada. Por quê?', 'Os motivos mais comuns são: lugar já cadastrado, informações insuficientes ou fora do escopo (destinos de bate-volta e lazer).'],
              ['Como excluir minha avaliação?', 'Acesse Perfil → Reviews, encontre a avaliação e toque no ícone 🗑️. A exclusão é imediata.'],
              ['Como denunciar uma avaliação falsa?', 'Na avaliação, toque no ícone 🚩. Nossa equipe vai analisar e tomar as medidas necessárias.'],
              ['Se eu excluir meu roteiro, o link compartilhado para de funcionar?', 'Não. Ao publicar, o roteiro vira uma cópia independente na comunidade. O link continua funcionando até você excluir da seção Compartilhados no seu perfil.'],
              ['Posso publicar o mesmo roteiro mais de uma vez?', 'Não. Após publicar, o botão fica bloqueado. Para remover e republicar, exclua da seção Compartilhados e publique novamente.'],
              ['Posso republicar um roteiro que copiei de outro usuário?', 'Não. Roteiros copiados não podem ser publicados na comunidade.'],
            ].map(([q, a]) => (
              <div key={q as string} className="border border-gray-100 rounded-xl p-4">
                <p className="font-semibold text-gray-900 text-sm mb-1">{q}</p>
                <p className="text-gray-600 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Rodapé */}
        <div className="mt-16 pt-8 border-t-2 border-orange-200 text-center">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="font-bold text-gray-900">LetsApp</p>
          <p className="text-orange-500 text-sm mt-1">Descubra o que tem pertinho de você</p>
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
    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
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
