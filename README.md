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

- **Next.js 14** + TypeScript + App Router
- **Firebase Firestore** + Auth (Google)
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

## Deploy no Vercel

```bash
npx vercel --prod
```

## Seed de dados (10 destinos do Sul do Brasil)

```bash
npx ts-node scripts/seed.ts
```

## Funcionalidades

- Busca por cidade + raio com autocomplete Google Places
- Filtro por categoria: praia, cachoeira, serra, cidade histórica, natureza, parque
- Clima em tempo real via OpenWeatherMap
- Tempo de carro via Google Distance Matrix
- Mapa interativo com pins dos destinos
- Reviews verificadas por GPS — só quem está no local pode avaliar
- Dicas da galera com sistema de curtidas
- Sugestão de lugares com moderação
- Perfil com login Google e histórico
- PWA instalável no celular com suporte offline

---

Feito com coração pra galera que curte explorar o Brasil
