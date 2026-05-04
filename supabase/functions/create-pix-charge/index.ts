/**
 * Cria cobrança PIX via Mercado Pago e devolve o payload (copia-e-cola) + id do pagamento.
 *
 * Secrets (Supabase → Edge Functions):
 *   MERCADOPAGO_ACCESS_TOKEN — Production Credential ou Token de teste
 *   MERCADOPAGO_PAYER_EMAIL — e-mail válido para o objeto payer (obrigatório na API MP)
 *
 * Opcional:
 *   MERCADOPAGO_API_BASE — default https://api.mercadopago.com
 *
 * Deploy: supabase functions deploy create-pix-charge
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function mpTxData(mpJson: Record<string, unknown>): Record<string, unknown> | undefined {
  const poi = mpJson.point_of_interaction as Record<string, unknown> | undefined
  return poi?.transaction_data as Record<string, unknown> | undefined
}

/** Código PIX copia-e-cola (EMV), não usar qr_code_base64 aqui — isso é imagem PNG. */
function mpEmvQrCode(mpJson: Record<string, unknown>): string | null {
  const tx = mpTxData(mpJson)
  const code = tx?.qr_code != null ? String(tx.qr_code).trim() : ''
  return code !== '' ? code : null
}

/** PNG em base64 puro devolvido pelo MP (fallback visual se o EMV não vier no POST). */
function mpQrPngBase64(mpJson: Record<string, unknown>): string | null {
  const tx = mpTxData(mpJson)
  const b64 = tx?.qr_code_base64 != null ? String(tx.qr_code_base64).trim() : ''
  return b64 !== '' ? b64 : null
}

async function mpFetchPaymentExtras(
  apiBase: string,
  accessToken: string,
  paymentId: string,
): Promise<{ emv: string | null; png: string | null }> {
  const r = await fetch(`${apiBase}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!r.ok) return { emv: null, png: null }
  const j = (await r.json()) as Record<string, unknown>
  return { emv: mpEmvQrCode(j), png: mpQrPngBase64(j) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')?.trim()
  const payerEmail = Deno.env.get('MERCADOPAGO_PAYER_EMAIL')?.trim()
  const apiBase =
    (Deno.env.get('MERCADOPAGO_API_BASE') ?? 'https://api.mercadopago.com').replace(
      /\/$/,
      '',
    )

  if (!accessToken || !payerEmail) {
    return new Response(
      JSON.stringify({
        error:
          'Mercado Pago não configurado: defina MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_PAYER_EMAIL nos secrets da função.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  let body: { gift_id?: string; amount?: number }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const giftId = body.gift_id?.trim()
  const amount = Number(body.amount)
  if (!giftId || !Number.isFinite(amount) || amount < 0.01) {
    return new Response(
      JSON.stringify({ error: 'gift_id e amount válidos são obrigatórios' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase mal configurado' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: gift, error: giftErr } = await admin
    .from('wedding_gifts')
    .select('id,title,price')
    .eq('id', giftId)
    .maybeSingle()

  if (giftErr) {
    return new Response(JSON.stringify({ error: giftErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!gift) {
    return new Response(JSON.stringify({ error: 'Presente não encontrado' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const target = round2(Number(gift.price))
  const { data: paidRows, error: paidErr } = await admin
    .from('gift_contributions')
    .select('amount')
    .eq('gift_id', giftId)
    .eq('payment_status', 'paid')

  if (paidErr) {
    return new Response(JSON.stringify({ error: paidErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const raised = (paidRows ?? []).reduce(
    (s, r) => s + round2(Number(r.amount)),
    0,
  )
  const remaining = Math.max(0, round2(target - raised))
  const amt = round2(amount)

  if (remaining > 0 && amt > remaining + 0.009) {
    return new Response(
      JSON.stringify({
        error: `Valor acima do que falta para a meta (${remaining.toFixed(2)}).`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  const externalReference = `wedding-gift:${giftId}:${crypto.randomUUID()}`

  const payRes = await fetch(`${apiBase}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Idempotency-Key': externalReference,
    },
    body: JSON.stringify({
      transaction_amount: amt,
      description: `Presente casamento: ${String(gift.title)}`.slice(0, 140),
      payment_method_id: 'pix',
      external_reference: externalReference,
      payer: {
        email: payerEmail,
      },
    }),
  })

  const payJson = (await payRes.json()) as Record<string, unknown> & {
    message?: string
    cause?: Array<{ description?: string }>
  }

  if (!payRes.ok) {
    const cause = payJson.cause?.[0]?.description
    const msg =
      cause ?? payJson.message ?? 'Mercado Pago recusou a cobrança PIX'
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const paymentId = payJson.id != null ? String(payJson.id) : ''
  let brCode = mpEmvQrCode(payJson)
  let qrPngBase64 = mpQrPngBase64(payJson)
  // Se o EMV não vier no POST, tentamos o GET (útil para cópia-e-cola).
  if (paymentId && !brCode) {
    const extra = await mpFetchPaymentExtras(apiBase, accessToken, paymentId)
    brCode = extra.emv ?? brCode
    if (!qrPngBase64) qrPngBase64 = extra.png
  }

  if (!paymentId) {
    return new Response(
      JSON.stringify({ error: 'Mercado Pago não devolveu o id do pagamento' }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  if (!brCode && !qrPngBase64) {
    return new Response(
      JSON.stringify({
        error:
          'Mercado Pago não devolveu código PIX (qr_code) nem imagem (qr_code_base64). Verifique se a conta tem PIX habilitado.',
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  const expiresAt =
    typeof payJson.date_of_expiration === 'string'
      ? payJson.date_of_expiration
      : null

  return new Response(
    JSON.stringify({
      brCode: brCode ?? '',
      qrPngBase64: qrPngBase64 ?? null,
      paymentId,
      expiresAt,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
