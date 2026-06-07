export const metadata = {
  title: 'Termos de Uso — LetsApp',
}

export default function TermosPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-gray-800">
      <div className="text-center mb-10 pb-8 border-b-2 border-orange-100">
        <img src="/logo512x512.png" alt="LetsApp" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Termos de Uso</h1>
        <p className="text-gray-400 text-sm">Última atualização: junho de 2026</p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">1. Identificação</h2>
          <p>O <strong>LetsApp</strong> é uma plataforma digital de descoberta de destinos e experiências de lazer, operada por Leonardo Moreno da Silva, acessível pelo endereço <strong>letsapp.app</strong>. Contato: <a href="mailto:contato@letsapp.app" className="text-orange-500 hover:underline">contato@letsapp.app</a>.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">2. Aceitação dos Termos</h2>
          <p>Ao acessar ou utilizar o LetsApp, você concorda com estes Termos de Uso e com nossa <a href="/privacidade" className="text-orange-500 hover:underline">Política de Privacidade</a>. Se não concordar, não utilize o serviço.</p>
          <p className="mt-2">O uso continuado após alterações nos termos implica aceitação das novas condições. Alterações relevantes serão comunicadas pelo app.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">3. O Serviço</h2>
          <p>O LetsApp oferece:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Busca e descoberta de destinos de lazer e bate-volta</li>
            <li>Avaliações verificadas por GPS de lugares, eventos, restaurantes e hospedagens</li>
            <li>Planejamento e compartilhamento de roteiros de viagem</li>
            <li>Rastreamento de localização em tempo real entre membros de um grupo</li>
            <li>Divulgação de eventos, restaurantes e hospedagens por anunciantes</li>
          </ul>
          <p className="mt-2">O serviço é fornecido no estado em que se encontra, podendo ser alterado, suspenso ou encerrado a qualquer momento.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">4. Cadastro e Conta</h2>
          <p>O acesso às funcionalidades do LetsApp requer autenticação via <strong>Google</strong>. Ao fazer login, você autoriza o LetsApp a utilizar as informações básicas da sua conta Google (nome, endereço de e-mail e foto de perfil) para personalizar sua experiência.</p>
          <p className="mt-2">Você é responsável por manter a segurança da sua conta Google e por todas as atividades realizadas através dela no LetsApp.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">5. Condutas Permitidas e Proibidas</h2>
          <p className="font-semibold text-gray-700 mt-2 mb-1">É permitido:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Avaliar lugares que você visitou de forma honesta e respeitosa</li>
            <li>Sugerir destinos, restaurantes e hospedagens para a comunidade</li>
            <li>Criar e compartilhar roteiros de viagem</li>
            <li>Usar o rastreamento de grupo para segurança e organização durante passeios</li>
          </ul>
          <p className="font-semibold text-gray-700 mt-3 mb-1">É proibido:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Publicar avaliações falsas, enganosas ou de lugares que você não visitou</li>
            <li>Usar linguagem ofensiva, discriminatória ou de assédio</li>
            <li>Enviar spam, conteúdo publicitário não autorizado ou links maliciosos</li>
            <li>Usar o rastreamento de grupo para monitorar pessoas sem o consentimento delas</li>
            <li>Tentar burlar os sistemas de verificação de localização</li>
            <li>Publicar conteúdo que viole direitos autorais ou a privacidade de terceiros</li>
            <li>Usar o serviço para fins ilegais ou que violem a legislação brasileira</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">6. Conteúdo Gerado pelo Usuário</h2>
          <p>Ao enviar avaliações, fotos, sugestões ou roteiros, você declara que:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>O conteúdo é de sua autoria ou você possui os direitos necessários para compartilhá-lo</li>
            <li>O conteúdo não viola direitos de terceiros, leis ou estes Termos</li>
          </ul>
          <p className="mt-2">Você concede ao LetsApp uma licença não exclusiva, gratuita e mundial para exibir, distribuir e promover o conteúdo enviado dentro da plataforma. Você mantém a propriedade do conteúdo e pode excluí-lo a qualquer momento pelo seu Perfil.</p>
          <p className="mt-2">O LetsApp reserva-se o direito de remover qualquer conteúdo que viole estes Termos, sem aviso prévio.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">7. Rastreamento de Grupo</h2>
          <p>A funcionalidade de rastreamento de localização em tempo real é de uso voluntário. Ao ativar o GPS nesta função, você:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Consente em compartilhar sua localização com os outros membros da sessão</li>
            <li>Declara que todos os membros do grupo têm ciência e concordam com o rastreamento</li>
            <li>Entende que as sessões expiram automaticamente após 24 horas</li>
          </ul>
          <p className="mt-2">É expressamente proibido usar o rastreamento para monitorar terceiros sem o consentimento deles. O LetsApp não se responsabiliza pelo uso indevido desta funcionalidade.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">8. Anunciantes</h2>
          <p>Negócios que utilizam o LetsApp para divulgar eventos, restaurantes ou hospedagens declaram que:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>As informações fornecidas são verdadeiras e atualizadas</li>
            <li>Possuem autorização para divulgar o negócio/evento</li>
            <li>Concordam com a revisão e possível rejeição do anúncio pela equipe LetsApp</li>
          </ul>
          <p className="mt-2">O LetsApp reserva-se o direito de remover anúncios que contenham informações falsas, enganosas ou que violem estes Termos.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">9. Propriedade Intelectual</h2>
          <p>A marca LetsApp, o design, o código e os conteúdos originais da plataforma são de propriedade exclusiva do LetsApp. É proibida a reprodução, modificação ou distribuição sem autorização prévia por escrito.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">10. Limitação de Responsabilidade</h2>
          <p>O LetsApp não se responsabiliza por:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Informações incorretas fornecidas por usuários ou anunciantes</li>
            <li>Condições dos lugares listados (acesso, segurança, clima)</li>
            <li>Danos ou prejuízos decorrentes do uso do app ou do deslocamento até os destinos</li>
            <li>Indisponibilidade temporária do serviço por manutenção ou problemas técnicos</li>
            <li>Perda de dados por falhas em serviços de terceiros (Google Firebase, Cloudinary)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">11. Suspensão e Encerramento</h2>
          <p>O LetsApp pode suspender ou encerrar o acesso de usuários que violem estes Termos, sem aviso prévio. Você pode encerrar sua participação a qualquer momento solicitando a exclusão dos seus dados pelo e-mail <a href="mailto:contato@letsapp.app" className="text-orange-500 hover:underline">contato@letsapp.app</a>.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">12. Lei Aplicável e Foro</h2>
          <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Eventuais conflitos serão resolvidos perante o foro da comarca do domicílio do usuário, conforme o Código de Defesa do Consumidor.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">13. Contato</h2>
          <p>Dúvidas, solicitações ou reclamações relacionadas a estes Termos devem ser enviadas para: <a href="mailto:contato@letsapp.app" className="text-orange-500 hover:underline">contato@letsapp.app</a></p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
        <p>Veja também nossa <a href="/privacidade" className="text-orange-500 hover:underline">Política de Privacidade</a></p>
        <p className="mt-1">LetsApp · contato@letsapp.app</p>
      </div>
    </div>
  )
}
