/**
 * Edge Function (Supabase): regista um PIX já recebido na conta.
 * Deploy: supabase functions deploy record-paid
 * Secrets: RECORD_PAID_SECRET, SUPABASE_SERVICE_ROLE_KEY (já injectado)
 *
 * Exemplo de chamada (use HTTPS, não exponha o secret no frontend):
 * curl -X POST "$SUPABASE_URL/functions/v1/record-paid" \
 *   -H "Authorization: Bearer $ANON_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"gift_id":"jantar","amount":100,"secret":"SEU_RECORD_PAID_SECRET"}'
 *
 * No mundo real, isto deve ser chamado pelo teu backend ao receber o webhook
 * do Mercado Pago / etc., nunca pelo browser do convidado.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type Body = { gift_id?: string; amount?: number; secret?: string }

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const secret = Deno.env.get('RECORD_PAID_SECRET')
  if (!secret || body.secret !== secret) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const giftId = body.gift_id?.trim()
  const amount = Number(body.amount)
  if (!giftId || !Number.isFinite(amount) || amount <= 0) {
    return new Response(
      JSON.stringify({ error: 'gift_id e amount obrigatórios' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Servidor mal configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(url, serviceKey)
  const { error } = await admin.from('gift_contributions').insert({
    gift_id: giftId,
    amount,
    payment_status: 'paid',
    paid_at: new Date().toISOString(),
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
})
