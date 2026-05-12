import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const seedPlaces = [
  {
    name: 'Lagoa do Peri',
    city: 'Florianópolis',
    state: 'SC',
    category: 'natureza',
    description: 'Maior lagoa de água doce da Ilha de Santa Catarina. Trilhas, natureza preservada e águas tranquilas. Ideal para um dia de descanso longe da correria.',
    lat: -27.7578,
    lng: -48.5197,
    averageRating: 4.7,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
  {
    name: 'Praia do Rosa',
    city: 'Imbituba',
    state: 'SC',
    category: 'praia',
    description: 'Uma das praias mais bonitas do Brasil. Avistamento de baleias entre junho e novembro. Visual deslumbrante do alto das dunas.',
    lat: -28.1289,
    lng: -48.6631,
    averageRating: 4.9,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
  {
    name: 'Cachoeira Véu de Noiva',
    city: 'Presidente Getúlio',
    state: 'SC',
    category: 'cachoeira',
    description: 'Queda d\'água de 30 metros em meio à Mata Atlântica. Trilha de 800m de dificuldade fácil. Água cristalina e fresca.',
    lat: -27.0489,
    lng: -49.6231,
    averageRating: 4.6,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
  {
    name: 'Serra do Rio do Rastro',
    city: 'Lauro Müller',
    state: 'SC',
    category: 'serra',
    description: 'Uma das estradas mais bonitas do mundo. Vista de 1000m de altitude. Curvas cinematográficas e paisagem deslumbrante.',
    lat: -28.3847,
    lng: -49.4891,
    averageRating: 4.8,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
  {
    name: 'Gramado',
    city: 'Gramado',
    state: 'RS',
    category: 'cidade_historica',
    description: 'Cidade mais charmosa do Sul do Brasil. Arquitetura europeia, chocolates artesanais e clima de montanha.',
    lat: -29.3744,
    lng: -50.8761,
    averageRating: 4.8,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
  {
    name: 'Parque Estadual da Serra do Tabuleiro',
    city: 'Santo Amaro da Imperatriz',
    state: 'SC',
    category: 'natureza',
    description: 'Maior unidade de conservação de Santa Catarina. Fauna e flora exuberantes. Cachoeiras e trilhas para todos os níveis.',
    lat: -27.8231,
    lng: -48.7891,
    averageRating: 4.5,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
  {
    name: 'Praia de Garopaba',
    city: 'Garopaba',
    state: 'SC',
    category: 'praia',
    description: 'Praia animada com ondas para surf e vila boêmia. Ótima gastronomia e vida noturna tranquila.',
    lat: -28.0241,
    lng: -48.6231,
    averageRating: 4.4,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
  {
    name: 'Cachoeira dos Bugres',
    city: 'Urubici',
    state: 'SC',
    category: 'cachoeira',
    description: 'Cachoeira gelada no Planalto Serrano. Uma das regiões mais frias do Brasil. Paisagem de inverno única.',
    lat: -28.0156,
    lng: -49.5912,
    averageRating: 4.6,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
  {
    name: 'Nova Veneza',
    city: 'Nova Veneza',
    state: 'SC',
    category: 'cidade_historica',
    description: 'Cidade com arquitetura italiana preservada. Gastronomia típica, vinhos e cultura italiana viva.',
    lat: -28.6341,
    lng: -49.5031,
    averageRating: 4.3,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
  {
    name: 'Praia de Içara',
    city: 'Içara',
    state: 'SC',
    category: 'praia',
    description: 'Praia tranquila a poucos km de Criciúma. Boa para famílias, sem multidões. Mar calmo e infraestrutura básica.',
    lat: -28.7156,
    lng: -49.2891,
    averageRating: 4.1,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
  },
]

async function seed() {
  console.log('🌱 Iniciando seed de destinos...')
  for (const place of seedPlaces) {
    const ref = await addDoc(collection(db, 'places'), {
      ...place,
      createdAt: serverTimestamp(),
    })
    console.log(`✅ ${place.name} — ID: ${ref.id}`)
  }
  console.log('\n🎉 Seed concluído! 10 destinos do Sul do Brasil adicionados.')
  process.exit(0)
}

seed().catch((e) => { console.error(e); process.exit(1) })
