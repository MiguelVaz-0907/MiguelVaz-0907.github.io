/**
 * Webhook Mercado Pago: ao aprovar pagamento PIX, grava em gift_contributions (paid).
 *
 * Painel MP → Sua aplicação → Webhooks / Notificações:
 *   URL: https://<ref>.supabase.co/functions/v1/mercadopago-webhook
 *   Eventos: pagamentos
 *
 * Opcional: URL com ?token=... igual a MERCADOPAGO_WEBHOOK_TOKEN (secret).
 *
 * Deploy: supabase functions deploy mercadopago-webhook
 * verify_jwt = false em supabase/config.toml
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** external_reference: wedding-gift:<gift_id>:<uuid> */
function giftIdFromExternalReference(ref: string): string | null {
  if (!ref.startsWith('wedding-gift:')) return null
  const rest = ref.slice('wedding-gift:'.length)
  const i = rest.indexOf(':')
  if (i <= 0) return null
  return rest.slice(0, i)
}

function paymentIdFromPayload(payload: Record<string, unknown>): string | null {
  const data = payload.data
  if (data && typeof data === 'object' && (data as { id?: unknown }).id != null) {
    return String((data as { id: unknown }).id)
  }
  const resource = payload.resource != null ? String(payload.resource) : ''
  const fromPath = resource.match(/\/payments\/(\d+)/)
  if (fromPath) return fromPath[1]
  const top = payload.id
  if (top != null && String(payload.type ?? '') === 'payment') {
    return String(top)
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const expected = Deno.env.get('MERCADOPAGO_WEBHOOK_TOKEN')?.trim()
  if (expected) {
    const url = new URL(req.url)
    const got = url.searchParams.get('token')?.trim()
    if (got !== expected) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')?.trim()
  const apiBase =
    (Deno.env.get('MERCADOPAGO_API_BASE') ?? 'https://api.mercadopago.com').replace(
      /\/$/,
      '',
    )

  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Servidor mal configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await req.json()) as Record<string, unknown>
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const payId = paymentIdFromPayload(payload)
  if (!payId) {
    return new Response(JSON.stringify({ ok: true, skip: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const payRes = await fetch(`${apiBase}/v1/payments/${payId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const payment = (await payRes.json()) as Record<string, unknown>
  if (!payRes.ok) {
    return new Response(JSON.stringify({ ok: true, skip: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const status = String(payment.status ?? '')
  const methodId = String(payment.payment_method_id ?? '')
  if (status !== 'approved' || methodId !== 'pix') {
    return new Response(JSON.stringify({ ok: true, ignored: status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const value = Number(payment.transaction_amount)
  const extRef =
    payment.external_reference != null
      ? String(payment.external_reference)
      : ''

  const giftId = giftIdFromExternalReference(extRef)
  if (!giftId || !Number.isFinite(value) || value <= 0) {
    return new Response(JSON.stringify({ ok: true, skip: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const urlSb = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!urlSb || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Servidor mal configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(urlSb, serviceKey)
  const { error } = await admin.from('gift_contributions').insert({
    gift_id: giftId,
    amount: round2(value),
    payment_status: 'paid',
    provider_ref: payId,
    paid_at: new Date().toISOString(),
  })

  if (error) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
