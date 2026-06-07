export const metadata = {
  title: 'Política de Privacidade — LetsApp',
}

export default function PrivacidadePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-gray-800">
      <div className="text-center mb-10 pb-8 border-b-2 border-orange-100">
        <img src="/logo512x512.png" alt="LetsApp" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Política de Privacidade</h1>
        <p className="text-gray-400 text-sm">Última atualização: junho de 2026</p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-8 text-sm">
        <p className="font-bold text-gray-800 mb-1">Resumo simples</p>
        <ul className="space-y-1 text-gray-600">
          <li>📧 Usamos seu nome, e-mail e foto do Google para criar seu perfil</li>
          <li>📍 Usamos seu GPS para mostrar lugares perto de você e verificar avaliações</li>
          <li>📡 No rastreamento de grupo, sua localização é compartilhada ao vivo com o grupo</li>
          <li>📸 Fotos que você envia ficam armazenadas no Cloudinary</li>
          <li>🗑️ Você pode solicitar a exclusão dos seus dados a qualquer momento</li>
        </ul>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">1. Controlador dos Dados</h2>
          <p>O controlador responsável pelo tratamento dos seus dados pessoais é:</p>
          <div className="bg-gray-50 rounded-xl p-4 mt-2">
            <p><strong>LetsApp</strong></p>
            <p>Responsável: Leonardo Moreno da Silva</p>
            <p>E-mail: <a href="mailto:contato@letsapp.app" className="text-orange-500 hover:underline">contato@letsapp.app</a></p>
          </div>
          <p className="mt-2">Esta Política está em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">2. Dados que Coletamos</h2>

          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-700 mb-1">2.1 Dados da conta Google</p>
              <p>Ao fazer login com Google, coletamos: nome completo, endereço de e-mail e foto de perfil. Estes dados são usados para identificar você no app e personalizar sua experiência.</p>
            </div>

            <div>
              <p className="font-semibold text-gray-700 mb-1">2.2 Localização geográfica (GPS)</p>
              <p>Coletamos sua localização nos seguintes contextos:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li><strong>Busca de destinos</strong> — para mostrar lugares próximos a você. Uso pontual, não armazenado.</li>
                <li><strong>Verificação de avaliações</strong> — para confirmar que você esteve no lugar. As coordenadas no momento da avaliação são armazenadas junto à avaliação.</li>
                <li><strong>Rastreamento de grupo</strong> — sua localização em tempo real é transmitida e compartilhada com os membros da sessão enquanto o GPS estiver ativo. Os dados de sessão são excluídos automaticamente após 24 horas.</li>
              </ul>
              <p className="mt-2 text-gray-500 italic">O app nunca coleta sua localização em segundo plano sem sua ação explícita.</p>
            </div>

            <div>
              <p className="font-semibold text-gray-700 mb-1">2.3 Fotos e conteúdo enviado</p>
              <p>Fotos enviadas em avaliações, sugestões e anúncios são armazenadas no serviço <strong>Cloudinary</strong> (EUA). Ao excluir uma avaliação ou sugestão, as fotos correspondentes também são removidas do Cloudinary.</p>
            </div>

            <div>
              <p className="font-semibold text-gray-700 mb-1">2.4 Conteúdo gerado</p>
              <p>Avaliações, roteiros, sugestões de lugares e anúncios que você cria ficam armazenados no <strong>Firebase Firestore</strong> (Google) associados ao seu UID de usuário.</p>
            </div>

            <div>
              <p className="font-semibold text-gray-700 mb-1">2.5 Dados de anunciantes</p>
              <p>Ao divulgar um evento, restaurante ou hospedagem no plano pago, coletamos nome, e-mail e telefone de contato para fins de aprovação e comunicação sobre o anúncio.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">3. Base Legal para o Tratamento</h2>
          <p>Tratamos seus dados com base nas seguintes hipóteses previstas na LGPD:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li><strong>Execução de contrato</strong> — para fornecer os serviços descritos nesta Política</li>
            <li><strong>Consentimento</strong> — para uso de localização GPS em tempo real (rastreamento)</li>
            <li><strong>Legítimo interesse</strong> — para melhoria do serviço e moderação de conteúdo</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">4. Finalidade do Tratamento</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>Autenticação e identificação do usuário</li>
            <li>Exibição de destinos, restaurantes e hospedagens próximos</li>
            <li>Verificação de presença para avaliações confiáveis</li>
            <li>Compartilhamento de localização em tempo real durante sessões de grupo</li>
            <li>Armazenamento e exibição de conteúdo gerado pelo usuário</li>
            <li>Comunicação sobre anúncios e sugestões enviados</li>
            <li>Moderação de conteúdo e segurança da plataforma</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">5. Serviços de Terceiros</h2>
          <p>O LetsApp utiliza os seguintes serviços de terceiros que podem processar seus dados:</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-orange-50">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-orange-100">Serviço</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-orange-100">Finalidade</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-orange-100">Política</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Google Firebase', 'Autenticação, banco de dados, rastreamento em tempo real', 'policies.google.com'],
                  ['Cloudinary', 'Armazenamento de fotos enviadas pelos usuários', 'cloudinary.com/privacy'],
                  ['Google Places API', 'Busca de lugares e autocomplete de cidades', 'policies.google.com'],
                  ['OpenWeatherMap', 'Clima em tempo real dos destinos', 'openweathermap.org/privacy-policy'],
                  ['Vercel', 'Hospedagem e entrega do aplicativo', 'vercel.com/legal/privacy-policy'],
                ].map(([s, f, p], i) => (
                  <tr key={s} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 border border-gray-100 font-medium">{s}</td>
                    <td className="px-3 py-2 border border-gray-100 text-gray-600">{f}</td>
                    <td className="px-3 py-2 border border-gray-100 text-gray-400 text-xs">{p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">6. Retenção dos Dados</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Dados de sessão de rastreamento</strong> — excluídos automaticamente após 24 horas</li>
            <li><strong>Avaliações e fotos</strong> — mantidos enquanto sua conta estiver ativa; excluídos ao remover a avaliação</li>
            <li><strong>Sugestões e anúncios</strong> — mantidos enquanto o conteúdo estiver publicado</li>
            <li><strong>Dados da conta</strong> — mantidos enquanto você usar o app; excluídos mediante solicitação</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">7. Seus Direitos (LGPD)</h2>
          <p>Conforme a Lei Geral de Proteção de Dados, você tem direito a:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li><strong>Acesso</strong> — saber quais dados temos sobre você</li>
            <li><strong>Correção</strong> — corrigir dados incompletos ou incorretos</li>
            <li><strong>Exclusão</strong> — solicitar a remoção dos seus dados pessoais</li>
            <li><strong>Portabilidade</strong> — receber seus dados em formato estruturado</li>
            <li><strong>Revogação do consentimento</strong> — retirar o consentimento para tratamentos baseados nele</li>
            <li><strong>Oposição</strong> — opor-se a tratamentos que causem dano</li>
          </ul>
          <p className="mt-2">Para exercer qualquer desses direitos, envie um e-mail para <a href="mailto:contato@letsapp.app" className="text-orange-500 hover:underline">contato@letsapp.app</a>. Respondemos em até 15 dias úteis.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">8. Segurança</h2>
          <p>Adotamos medidas técnicas para proteger seus dados, incluindo autenticação segura via Google, comunicação criptografada (HTTPS) e controles de acesso no banco de dados. Nenhum sistema é 100% seguro — em caso de incidente, comunicaremos os afetados e a ANPD conforme exigido pela LGPD.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">9. Crianças e Adolescentes</h2>
          <p>O LetsApp não é direcionado a menores de 13 anos. Usuários entre 13 e 18 anos devem ter o consentimento de um responsável legal para utilizar o serviço. Caso identifiquemos dados de menores sem consentimento, os removeremos imediatamente.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">10. Cookies e Armazenamento Local</h2>
          <p>O LetsApp utiliza armazenamento local do navegador (localStorage/sessionStorage) para salvar preferências de busca e estado da sessão. Não utilizamos cookies de rastreamento ou publicidade de terceiros.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">11. Alterações nesta Política</h2>
          <p>Esta Política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas através do app. O uso continuado após as alterações implica aceitação da nova versão.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">12. Contato e Encarregado de Dados (DPO)</h2>
          <p>Para dúvidas, solicitações ou reclamações sobre privacidade e proteção de dados:</p>
          <div className="bg-gray-50 rounded-xl p-4 mt-2">
            <p><strong>LetsApp — Encarregado de Proteção de Dados</strong></p>
            <p>E-mail: <a href="mailto:contato@letsapp.app" className="text-orange-500 hover:underline">contato@letsapp.app</a></p>
          </div>
          <p className="mt-2">Você também pode registrar reclamações junto à <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> em <span className="text-gray-500">gov.br/anpd</span>.</p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
        <p>Veja também nossos <a href="/termos" className="text-orange-500 hover:underline">Termos de Uso</a></p>
        <p className="mt-1">LetsApp · contato@letsapp.app</p>
      </div>
    </div>
  )
}
