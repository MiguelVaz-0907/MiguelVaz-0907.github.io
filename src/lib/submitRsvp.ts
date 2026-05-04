import { getSupabaseBrowserClient } from './supabaseClient'

export type RsvpPayload = {
  full_name: string
  attending: 'yes' | 'no'
  /** Para convidados da lista: 1 pessoa confirma; sim = 1, não = 0. */
  guest_count: number
}

export type RsvpSubmitResult =
  | { ok: true; mode: 'supabase' }
  | { ok: false; message: string }

export async function submitRsvpToSupabase(
  payload: RsvpPayload,
): Promise<RsvpSubmitResult> {
  const sb = getSupabaseBrowserClient()
  if (!sb) {
    return {
      ok: false,
      message:
        'Supabase não está configurado no site. Corra o SQL em supabase/migrations/002_rsvp_responses.sql e defina VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, ou confirme a presença por mensagem direta aos noivos.',
    }
  }

  const { error } = await sb.from('rsvp_responses').insert({
    full_name: payload.full_name.trim(),
    email: null,
    phone: null,
    attending: payload.attending,
    guest_count: payload.guest_count,
    dietary_notes: null,
    message: null,
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, mode: 'supabase' }
}

export function formatRsvpForMessage(
  payload: RsvpPayload,
  names: string,
): string {
  const attendingLabel =
    payload.attending === 'yes' ? 'Vou comparecer' : 'Não vou comparecer'
  return [
    `Confirmação de presença — ${names}`,
    `Nome na lista: ${payload.full_name.trim()}`,
    `Resposta: ${attendingLabel}`,
  ].join('\n')
}
