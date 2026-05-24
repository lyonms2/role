# 🗺️ Rolê

> Descobre o que tem pertinho de você

App PWA para brasileiros que querem dar um rolê de carro num feriado e não sabem pra onde ir. Destinos próximos, reviews verificadas por GPS, dicas de quem realmente foi lá.

## Como funciona

1. Informa sua cidade e o raio que quer percorrer
2. Escolhe o tipo de destino (praia, cachoeira, serra...)
3. Vê os destinos com clima em tempo real e tempo de carro
4. Lê reviews de quem realmente esteve no local (verificado por GPS)
5. Abre no Maps e vai embora!

## Stack

- **Next.js 15** + TypeScript + App Router
- **Firebase Firestore** + Auth (Google)
- **Cloudinary** (upload de imagens)
- **Google Places API** + Maps JS + Distance Matrix
- **OpenWeatherMap API**
- **PWA** via next-pwa
- **Vercel** (deploy)

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local
# Preenche as keys no .env.local
npm run dev
```

## APIs necessárias

### Google Cloud Console
1. Acessa [console.cloud.google.com](https://console.cloud.google.com/)
2. Cria um projeto e ativa: Maps JavaScript API, Places API, Distance Matrix API
3. Cria uma API Key

### OpenWeatherMap
1. Cria conta gratuita em [openweathermap.org](https://openweathermap.org)
2. Pega a API Key na conta

### Firebase
1. Cria projeto em [console.firebase.google.com](https://console.firebase.google.com/)
2. Ativa Firestore Database e Authentication (Google)
3. Pega as credenciais do Web App

### Cloudinary
1. Cria conta em [cloudinary.com](https://cloudinary.com)
2. Pega Cloud Name, API Key e API Secret
3. Cria um upload preset sem assinatura

## Deploy no Vercel

```bash
npx vercel --prod
```

## Seed de dados (10 destinos do Sul do Brasil)

```bash
npx ts-node scripts/seed.ts
```

---

## Funcionalidades

### Busca e Descoberta
- Busca por cidade + raio com autocomplete Google Places
- Filtro hierárquico por categoria: praia, cachoeira, serra, cidade histórica, natureza, parque
- Clima em tempo real via OpenWeatherMap
- Tempo de carro via Google Distance Matrix
- Mapa interativo com pins dos destinos
- PWA instalável no celular com suporte offline

### Destinos (`/places`)
- Cards com foto, clima, distância, avaliação média e contagem de reviews
- Reviews verificadas por GPS — só quem está no local pode avaliar
- Dicas da galera com sistema de curtidas
- Sugestão de lugares com moderação pelo admin

### Eventos (`/eventos`)
- Listagem de eventos com cards interativos
- Sistema de reviews com nota de 1 a 5 estrelas
- Médias e contagem de avaliações em tempo real

### Comer (`/comer`)
- Restaurantes e lanchonetes próximos
- Reviews com nota e faixa de preço comunitária
- Preço médio calculado pela comunidade

### Hospedar (`/hospedar`)
- Hospedagens próximas (pousadas, hotéis, camping)
- Reviews com nota e faixa de preço comunitária
- Preço médio calculado pela comunidade

### Roteiros (`/roteiro`)
- Criação de roteiros personalizados com nome, descrição, dias e lista de paradas
- Compartilhamento de roteiros com a comunidade
- **Copiar roteiro**: salva uma cópia no perfil com um clique
  - Impede cópia duplicada (persistência via Firestore entre sessões)
  - Permite re-copiar se o usuário excluiu a cópia anterior
  - Feedback imediato "✓ Copiado!" sem precisar recarregar a página
- **Ordenação por mais avaliados** (toggle "⭐ Mais avaliados")
- **Reviews colapsáveis** abaixo de cada card, paginadas em grupos de 5
- Carregamento lazy das reviews (só busca ao expandir o card)
- Sistema de avaliação de roteiros comunitários

### Visualização de Roteiro (`/ver/[id]`)
- Página pública compartilhável de qualquer roteiro
- Comportamento adaptativo:
  - **Usuário logado**: header com "← Voltar", sem CTAs de download
  - **Visitante externo**: branding "LetsApp" + botão "Abrir LetsApp →"
- Botão "Copiar este roteiro" oculto para o próprio autor
- Denúncia de reviews com modal de confirmação (🚩 Denunciar)

### Perfil (`/perfil`)
- Login com Google
- **Estatísticas**: total de avaliações feitas (Destinos + Eventos + Comer + Hospedar + Roteiros)
- **Aba Roteiros**: roteiros criados e copiados, com modal de detalhes
- **Aba Avaliações**: sub-abas por tipo
  - Destinos · Eventos · Comer · Hospedar · Roteiros
  - Paginação de 5 por sub-aba
  - Contagem individual por categoria
- **Aba Sugestões**: sugestões de lugares enviadas
- Modal de roteiro com largura controlada no desktop (max-w-2xl)

### Painel Admin (`/adm`)
- **Aba Anúncios**: solicitações de parceiros pendentes
- **Aba Sugestões**: sugestões da comunidade com aprovação/rejeição
- **Aba Denúncias**: reports de reviews com moderação
- **Aba Publicados**: gerenciamento de conteúdo por categoria
  - Sub-abas: Eventos · Restaurantes · Hospedagens
  - Edição inline e exclusão de itens
  - Paginação em todas as seções

---

## Coleções Firestore

| Coleção | Descrição |
|---|---|
| `places` | Destinos de passeio |
| `reviews` | Avaliações de destinos |
| `events` | Eventos |
| `eventReviews` | Avaliações de eventos |
| `eats` | Restaurantes e lanchonetes |
| `eatReviews` | Avaliações de restaurantes |
| `stays` | Hospedagens |
| `stayReviews` | Avaliações de hospedagens |
| `roteiros` | Roteiros criados e copiados |
| `roteiroReviews` | Avaliações de roteiros |
| `suggestions` | Sugestões de lugares pela comunidade |
| `reports` | Denúncias de reviews |
| `advertiser_requests` | Solicitações de anunciantes |

---

Feito com coração pra galera que curte explorar o Brasil
