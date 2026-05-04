import { normalizePixKey } from './lib/normalizePixKey'
import { stripEnvQuotes } from './lib/stripEnvQuotes'

export type PixMode = 'static' | 'dynamic'

/**
 * static = QR gerado no browser (chave PIX no .env).
 * dynamic = cobrança Mercado Pago PIX (Edge Function + webhook); requer deploy e secrets.
 */
export function getPixMode(): PixMode {
  const m = String(import.meta.env.VITE_PIX_MODE ?? 'static')
    .trim()
    .toLowerCase()
  return m === 'dynamic' ? 'dynamic' : 'static'
}

export type Gift = {
  id: string
  title: string
  description: string
  price: number
}

export type CouplePhoto = {
  src: string
  alt: string
}

/** Convidado na lista de confirmação de presença (um registo por pessoa ou família, como preferirem). */
export type InvitedGuest = {
  id: string
  /** Nome como sai no convite / lista. */
  name: string
}

export const wedding = {
  names: 'Thayna & Eduardo',
  /** Logo sem fundo em /public (PNG ou SVG); ícone do separador usa o mesmo ficheiro. */
  logoSrc:
    '/fotos/' + encodeURIComponent('logo sem fundo.png'),
  logoAlt: 'Thayna e Eduardo',
  date: '22 de novembro de 2026',
  /** Horário de referência (ajuste no texto completo abaixo, se precisar). */
  time: '17:00',
  timeDetail: 'Cerimónia às 17h — receção a seguir',
  tagline: 'Celebrar o amor com as pessoas que amamos',
  venue: 'Belém do Pará',
  venueName: 'Local a definir',
  venueAddress: 'Belém, PA — morada completa em breve',
  /** Link partilhado do Google Maps ou Waze; deixe vazio até ter o link final. */
  mapsUrl: '',
  /** PNG decorativo sem fundo (ex.: folha) em /public/decoracao. Deixe vazio para ocultar. */
  decorationLeafSrc: '/decoracao/elemento-folha-casamento.png',
  /**
   * Coloquem aqui as vossas fotos: ficheiros em /public (ex.: /fotos/casal-1.jpg)
   * ou URLs. Estas imagens são exemplo — substituam quando quiserem.
   */
  couplePhotos: [
    {
      src: '/fotos/fotos%20noivos%2001.jpg',
      alt: 'Thayna e Eduardo',
    },
    {
      src: '/fotos/fotos%20noivos%2002.jpg',
      alt: 'Thayna e Eduardo',
    },
  ] satisfies CouplePhoto[],
}

/**
 * Reserva local se o Supabase não estiver configurado ou falhar o carregamento.
 * Com Supabase + migração 003, a lista em produção vem da tabela wedding_invited_guests.
 */
export const invitedGuests: InvitedGuest[] = [
  { id: 'maria-silva', name: 'Maria Silva' },
  { id: 'joao-santos', name: 'João Santos' },
  { id: 'familia-oliveira', name: 'Família Oliveira' },
]

/**
 * Reserva local se o Supabase não estiver configurado ou falhar o carregamento.
 * Em produção com migração 003, os presentes vêm da tabela wedding_gifts.
 */
export const gifts: Gift[] = [
  {
    id: 'jantar',
    title: 'Jantar romântico pós-lua de mel',
    description: 'Uma noite especial para fechar com chave de ouro.',
    price: 450,
  },
  {
    id: 'panelas',
    title: 'Jogo de panelas premium',
    description: 'Para a casa nova cheirar a comida feita com carinho.',
    price: 899.9,
  },
  {
    id: 'cafeteira',
    title: 'Cafeteira espresso',
    description: 'Manhãs mais gostosas ao lado um do outro.',
    price: 1200,
  },
  {
    id: 'lua',
    title: 'Contribuição para a lua de mel',
    description: 'Qualquer valor ajuda a tornar a viagem inesquecível.',
    price: 300,
  },
  {
    id: 'toalhas',
    title: 'Jogo de toalhas de banho',
    description: 'Conforto e maciez para o dia a dia.',
    price: 280,
  },
  {
    id: 'vinhos',
    title: 'Seleção de vinhos',
    description: 'Para brindar histórias e futuras celebrações.',
    price: 350,
  },
]

export function getPixEnv() {
  return {
    pixKey: normalizePixKey(String(import.meta.env.VITE_PIX_KEY ?? '')),
    merchantName: stripEnvQuotes(
      String(import.meta.env.VITE_PIX_MERCHANT_NAME ?? ''),
    ),
    merchantCity: stripEnvQuotes(
      String(import.meta.env.VITE_PIX_MERCHANT_CITY ?? ''),
    ),
  }
}

export function isPixConfigured(): boolean {
  const { pixKey, merchantName, merchantCity } = getPixEnv()
  return Boolean(pixKey && merchantName && merchantCity)
}
