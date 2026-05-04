import { useCallback, useEffect, useMemo, useState } from 'react'
import { CoupleLogo } from '../components/CoupleLogo'
import { LeafDecoration } from '../components/LeafDecoration'
import {
  getPixEnv,
  getPixMode,
  isPixConfigured,
  wedding,
  type Gift,
} from '../config'
import { usePublicGifts } from '../hooks/usePublicGifts'
import { roundBRL } from '../lib/giftFunding'
import { gerarBrCodePix } from '../lib/gerarBrCodePix'
import { readFunctionsHttpBody } from '../lib/readFunctionsInvokeError'
import { getSupabaseBrowserClient, supabaseConfigured } from '../lib/supabaseClient'
import { PixQrImage } from '../PixQrImage'
import { useConfirmedFunding } from '../useConfirmedFunding'

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

type ModalStep = 'amount' | 'pix'

function fundingPct(raised: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((raised / target) * 1000) / 10)
}

function parseMoneyInput(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return roundBRL(n)
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [locked])
}

function GiftProgressBar({
  raised,
  target,
  compact,
  hint,
}: {
  raised: number
  target: number
  compact?: boolean
  hint?: string
}) {
  const pct = fundingPct(raised, target)
  const label =
    target > 0
      ? `${money.format(raised)} de ${money.format(target)} (${pct}% da meta)`
      : money.format(raised)

  return (
    <div className={compact ? 'fund compact' : 'fund'}>
      <div
        className="fund__track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Arrecadado: ${label}`}
      >
        <div className="fund__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="fund__label">{label}</p>
      {hint ? <p className="fund__hint">{hint}</p> : null}
    </div>
  )
}

export function GiftsPage() {
  const pixMode = getPixMode()
  const {
    gifts,
    loading: giftsCatalogLoading,
    error: giftsCatalogError,
    source: giftsCatalogSource,
  } = usePublicGifts()
  const { getRaised, loading, fetchError, hasRemote, refresh } =
    useConfirmedFunding()
  const [selected, setSelected] = useState<Gift | null>(null)
  const [modalStep, setModalStep] = useState<ModalStep>('amount')
  const [amountStr, setAmountStr] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [committedAmount, setCommittedAmount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [dynamicBrCode, setDynamicBrCode] = useState<string | null>(null)
  /** PNG base64 do Mercado Pago (fallback se o EMV não vier). */
  const [dynamicQrPng, setDynamicQrPng] = useState<string | null>(null)
  const [dynamicPixError, setDynamicPixError] = useState<string | null>(null)
  const [dynamicPixLoading, setDynamicPixLoading] = useState(false)

  const pixReady =
    pixMode === 'dynamic' ? supabaseConfigured() : isPixConfigured()

  useEffect(() => {
    if (!selected) return
    const raised = getRaised(selected.id)
    const remaining = Math.max(0, roundBRL(selected.price - raised))
    const suggested =
      remaining > 0 ? remaining : Math.max(10, Math.min(50, selected.price))
    setAmountStr(String(suggested))
    setModalStep('amount')
    setCommittedAmount(0)
    setAmountError(null)
    setCopied(false)
    setDynamicBrCode(null)
    setDynamicQrPng(null)
    setDynamicPixError(null)
    setDynamicPixLoading(false)
  }, [selected?.id])

  const pixResult = useMemo(() => {
    if (pixMode === 'dynamic') return null
    if (
      !selected ||
      !pixReady ||
      modalStep !== 'pix' ||
      committedAmount <= 0
    ) {
      return null
    }
    const { pixKey, merchantName, merchantCity } = getPixEnv()
    const desc = `Presente: ${selected.title} | ${money.format(committedAmount)}`
    return gerarBrCodePix({
      pixKey,
      merchantName,
      merchantCity,
      transactionAmount: committedAmount,
      infoAdicional: desc.slice(0, 72),
    })
  }, [pixMode, selected, pixReady, modalStep, committedAmount])

  const brCode =
    pixMode === 'dynamic'
      ? (dynamicBrCode ?? '')
      : pixResult?.ok === true
        ? pixResult.brCode
        : ''

  const canShowQr =
    pixMode === 'dynamic'
      ? Boolean((dynamicBrCode ?? '').trim()) ||
        Boolean((dynamicQrPng ?? '').trim())
      : Boolean(brCode)

  const pixFailMessage =
    pixMode === 'dynamic'
      ? dynamicPixError
      : modalStep === 'pix' && pixResult?.ok === false
        ? pixResult.message
        : null

  useBodyScrollLock(Boolean(selected))

  const closeModal = useCallback(() => {
    setSelected(null)
    setModalStep('amount')
    setCommittedAmount(0)
    setCopied(false)
    setAmountError(null)
    setDynamicBrCode(null)
    setDynamicQrPng(null)
    setDynamicPixError(null)
    setDynamicPixLoading(false)
  }, [])

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, closeModal])

  const copyCode = async () => {
    if (!brCode) return
    try {
      await navigator.clipboard.writeText(brCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(false)
    }
  }

  const remainingForGift = (g: Gift) =>
    Math.max(0, roundBRL(g.price - getRaised(g.id)))

  const validateAndGoPix = async () => {
    if (!selected) return
    const v = parseMoneyInput(amountStr)
    const remaining = remainingForGift(selected)

    if (v === null || v < 0.01) {
      setAmountError('Informe um valor válido (mínimo R$ 0,01).')
      return
    }

    if (remaining > 0 && v > remaining + 0.001) {
      setAmountError(
        `Para esta meta, o máximo sugerido agora é ${money.format(remaining)} (falta esse valor para o objetivo). Você pode ajustar o valor ou, se quiser doar mais, faça em duas etapas.`,
      )
      return
    }

    setAmountError(null)

    if (pixMode === 'dynamic') {
      setDynamicBrCode(null)
      setDynamicQrPng(null)
      setDynamicPixError(null)
      setCommittedAmount(v)
      setModalStep('pix')
      setDynamicPixLoading(true)
      const sb = getSupabaseBrowserClient()
      if (!sb) {
        setDynamicPixLoading(false)
        setDynamicPixError(
          'Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
        )
        setModalStep('amount')
        return
      }
      try {
        const { data, error } = await sb.functions.invoke(
          'create-pix-charge',
          {
            body: { gift_id: selected.id, amount: roundBRL(v) },
          },
        )
        const payloadErr =
          data && typeof data === 'object' && 'error' in data
            ? String((data as { error: unknown }).error)
            : null
        if (error) {
          const httpDetail = await readFunctionsHttpBody(error)
          const parts = [
            httpDetail?.message,
            payloadErr,
            error.message,
            httpDetail?.status != null ? `HTTP ${httpDetail.status}` : '',
          ].filter(Boolean)
          setDynamicPixError(
            parts.join(' — ') || 'Falha ao chamar create-pix-charge.',
          )
          setModalStep('amount')
          return
        }
        const errMsg = payloadErr
        const code =
          data && typeof data === 'object' && 'brCode' in data
            ? String((data as { brCode: unknown }).brCode)
            : ''
        const pngRaw =
          data && typeof data === 'object' && 'qrPngBase64' in data
            ? (data as { qrPngBase64: unknown }).qrPngBase64
            : null
        const png =
          pngRaw != null && String(pngRaw).trim() !== ''
            ? String(pngRaw).trim()
            : ''
        const hasVisual = code.trim() !== '' || png !== ''
        if (errMsg || !hasVisual) {
          setDynamicPixError(
            errMsg || 'Resposta inválida do servidor (sem código nem imagem PIX).',
          )
          setModalStep('amount')
          return
        }
        setDynamicBrCode(code)
        setDynamicQrPng(png || null)
      } catch (e) {
        setDynamicPixError(
          e instanceof Error ? e.message : 'Falha ao criar cobrança PIX.',
        )
        setModalStep('amount')
      } finally {
        setDynamicPixLoading(false)
      }
      return
    }

    setCommittedAmount(v)
    setModalStep('pix')
  }

  const applyQuickAmount = (value: number) => {
    setAmountStr(String(roundBRL(value)))
    setAmountError(null)
  }

  const progressHint = hasRemote
    ? loading
      ? 'Carregando valores confirmados…'
      : undefined
    : 'Para ver aqui o que já caiu na conta, configure Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).'

  return (
    <>
      <header className="page-hero page-hero--decor" aria-label="Lista de presentes">
        <LeafDecoration variant="banner" />
        <div className="page-hero__inner">
          <div className="page-hero__eyebrow page-hero__eyebrow--logo">
            <CoupleLogo variant="banner" />
          </div>
          <h1 className="page-hero__title">Lista de presentes</h1>
          <p className="page-hero__lead">{wedding.tagline}</p>
        </div>
      </header>

      <main id="conteudo" className="main">
        {giftsCatalogLoading ? (
          <p className="intro__text" role="status">
            A carregar a lista de presentes…
          </p>
        ) : null}
          {giftsCatalogError ? (
          <div className="alert" role="alert">
            <strong>Lista:</strong> {giftsCatalogError} (a mostrar dados locais
            de reserva, se existirem).
          </div>
        ) : null}
          {pixMode === 'dynamic' && giftsCatalogSource === 'fallback' && (
            <div className="alert" role="status">
              <strong>PIX dinâmico:</strong> a lista de presentes está em modo
              local (Supabase não devolveu a tabela). O QR pode falhar com
              &quot;Presente não encontrado&quot; enquanto os mesmos{' '}
              <code className="inline-code">id</code> não existirem em{' '}
              <code className="inline-code">wedding_gifts</code> no painel SQL /
              admin.
            </div>
          )}
        <section className="intro">
          <p className="intro__sub intro__sub--gifts">
            {pixMode === 'dynamic' ? (
              <>
                Cada pagamento gera um <strong>PIX dinâmico</strong> (Mercado
                Pago, cobrança com referência própria). Quando o pagamento for
                confirmado, o <strong>webhook</strong> regista o valor no
                Supabase e a barra de progresso actualiza.
              </>
            ) : (
              <>
                O valor da barra de progresso só aumenta quando o pagamento é
                registado no sistema — ou seja, depois de o dinheiro ter sido
                confirmado na vossa conta (via Supabase + webhook ou inserção
                manual). O site gera o PIX estático; o banco não avisa o
                navegador sozinho.
              </>
            )}
          </p>
          {fetchError && (
            <div className="alert" role="alert">
              <strong>Supabase:</strong> não foi possível carregar totais (
              {fetchError}). Verifique a tabela e as políticas RLS.
            </div>
          )}
          {!hasRemote && pixReady && pixMode !== 'dynamic' && (
            <div className="alert" role="status">
              <strong>Progresso confirmado:</strong> adicione{' '}
              <code className="inline-code">VITE_SUPABASE_URL</code> e{' '}
              <code className="inline-code">VITE_SUPABASE_ANON_KEY</code> ao{' '}
              <code className="inline-code">.env</code>, execute o SQL em{' '}
              <code className="inline-code">
                supabase/migrations/001_gift_contributions.sql
              </code>{' '}
              no painel do Supabase e ligue um webhook que insira linhas com{' '}
              <code className="inline-code">payment_status = paid</code> (ver{' '}
              <code className="inline-code">supabase/functions/record-paid</code>
              ).
            </div>
          )}
          {!hasRemote && pixReady && pixMode === 'dynamic' && (
            <div className="alert" role="status">
              <strong>Supabase:</strong> sem URL/anon key a barra não mostra
              totais. Com <code className="inline-code">VITE_PIX_MODE=dynamic</code>{' '}
              também precisa das Edge Functions e webhook Mercado Pago (ver comentários
              no código das funções).
            </div>
          )}
          {!pixReady && (
            <div className="alert" role="status">
              <strong>Configuração:</strong>{' '}
              {pixMode === 'dynamic' ? (
                <>
                  modo dinâmico precisa de{' '}
                  <code className="inline-code">VITE_SUPABASE_URL</code> e{' '}
                  <code className="inline-code">VITE_SUPABASE_ANON_KEY</code>,{' '}
                  deploy de <code className="inline-code">create-pix-charge</code>{' '}
                  e <code className="inline-code">mercadopago-webhook</code>, e
                  credenciais Mercado Pago (access token + e-mail do payer na API).
                </>
              ) : (
                <>
                  crie um arquivo <code className="inline-code">.env</code> com{' '}
                  <code className="inline-code">VITE_PIX_KEY</code>,{' '}
                  <code className="inline-code">VITE_PIX_MERCHANT_NAME</code> e{' '}
                  <code className="inline-code">VITE_PIX_MERCHANT_CITY</code>.
                </>
              )}
            </div>
          )}
        </section>

        <ul className="gift-grid" aria-busy={giftsCatalogLoading}>
          {gifts.map((gift) => {
            const raised = getRaised(gift.id)
            return (
              <li key={gift.id}>
                <article className="gift-card">
                  <div className="gift-card__accent" aria-hidden />
                  <div className="gift-card__body">
                    <span className="gift-card__icon" aria-hidden>
                      ✦
                    </span>
                    <h3 className="gift-card__title">{gift.title}</h3>
                    <p className="gift-card__desc">{gift.description}</p>
                    <p className="gift-card__meta">
                      Objetivo: <strong>{money.format(gift.price)}</strong>
                    </p>
                    <GiftProgressBar
                      raised={raised}
                      target={gift.price}
                      compact
                      hint={progressHint}
                    />
                    <button
                      type="button"
                      className="gift-card__cta"
                      onClick={() => setSelected(gift)}
                      disabled={!pixReady}
                    >
                      Presentear
                    </button>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
        {!giftsCatalogLoading && gifts.length === 0 ? (
          <p className="intro__text" role="status">
            Ainda não há presentes publicados. Quando o Supabase estiver
            ligado, podem acrescentá-los em <strong>/admin</strong>.
          </p>
        ) : null}
      </main>

      <footer className="footer">
        <p>Com carinho, {wedding.names}</p>
      </footer>

      {selected && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="modal modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal__close"
              onClick={closeModal}
              aria-label="Fechar"
            >
              ×
            </button>

            {modalStep === 'amount' ? (
              <>
                <h2 id="modal-title" className="modal__title">
                  {selected.title}
                </h2>
                <p className="modal__subtitle">
                  Objetivo do presente:{' '}
                  <strong>{money.format(selected.price)}</strong>
                </p>
                <GiftProgressBar
                  raised={getRaised(selected.id)}
                  target={selected.price}
                  hint={progressHint}
                />
                <p className="modal__hint modal__hint--left">
                  Quanto deseja contribuir via PIX? Pode ser o que falta ou um
                  valor menor.
                </p>
                <div className="amount-field">
                  <label className="amount-field__label" htmlFor="gift-amount">
                    Valor (R$)
                  </label>
                  <input
                    id="gift-amount"
                    className="amount-field__input"
                    type="number"
                    min={0.01}
                    step={0.01}
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value)
                      setAmountError(null)
                    }}
                  />
                </div>
                {(() => {
                  const rem = remainingForGift(selected)
                  if (rem <= 0) return null
                  return (
                    <div className="quick-amounts" aria-label="Valores rápidos">
                      <button
                        type="button"
                        className="quick-amounts__btn"
                        onClick={() =>
                          applyQuickAmount(
                            Math.max(0.01, roundBRL(rem * 0.25)),
                          )
                        }
                      >
                        25% do que falta
                      </button>
                      <button
                        type="button"
                        className="quick-amounts__btn"
                        onClick={() =>
                          applyQuickAmount(Math.max(0.01, roundBRL(rem * 0.5)))
                        }
                      >
                        50% do que falta
                      </button>
                      <button
                        type="button"
                        className="quick-amounts__btn"
                        onClick={() => applyQuickAmount(rem)}
                      >
                        Fechar meta (resta {money.format(rem)})
                      </button>
                    </div>
                  )
                })()}
                {amountError && (
                  <p className="modal__error" role="alert">
                    {amountError}
                  </p>
                )}
                {!pixReady ? (
                  <p className="modal__error">
                    {pixMode === 'dynamic' ? (
                      <>
                        Modo PIX dinâmico: configure{' '}
                        <code className="inline-code">VITE_SUPABASE_URL</code>{' '}
                        e{' '}
                        <code className="inline-code">
                          VITE_SUPABASE_ANON_KEY
                        </code>{' '}
                        e faça deploy da função{' '}
                        <code className="inline-code">create-pix-charge</code>{' '}
                        com secrets do Mercado Pago.
                      </>
                    ) : (
                      <>
                        Configure o <code className="inline-code">.env</code> e
                        reinicie o servidor.
                      </>
                    )}
                  </p>
                ) : (
                  <button
                    type="button"
                    className="modal__primary"
                    onClick={validateAndGoPix}
                  >
                    Concluir pagamento
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="modal__back"
                  onClick={() => {
                    setModalStep('amount')
                    setCopied(false)
                    setDynamicBrCode(null)
                    setDynamicQrPng(null)
                    setDynamicPixError(null)
                    setDynamicPixLoading(false)
                  }}
                >
                  ← Alterar valor
                </button>
                <h2 id="modal-title" className="modal__title">
                  PIX — {selected.title}
                </h2>
                <p className="modal__amount">
                  Valor deste pagamento:{' '}
                  <strong>{money.format(committedAmount)}</strong>
                </p>
                <p className="modal__smallprint">
                  Na conta (registado no sistema):{' '}
                  <strong>{money.format(getRaised(selected.id))}</strong> de{' '}
                  {money.format(selected.price)} (
                  {fundingPct(getRaised(selected.id), selected.price)}%).
                  {hasRemote
                    ? ' Atualiza automaticamente quando o webhook inserir um pagamento confirmado.'
                    : ' Ligue o Supabase para esta barra refletir depósitos reais.'}
                </p>
                {!pixReady ? (
                  <p className="modal__error">
                    {pixMode === 'dynamic' ? (
                      <>
                        Veja <code className="inline-code">VITE_PIX_MODE</code>{' '}
                        e Supabase (função create-pix-charge).
                      </>
                    ) : (
                      <>
                        Configure o arquivo{' '}
                        <code className="inline-code">.env</code> com as
                        variáveis PIX e reinicie o{' '}
                        <code className="inline-code">npm run dev</code>.
                      </>
                    )}
                  </p>
                ) : dynamicPixLoading ? (
                  <p className="modal__hint" role="status">
                    A gerar cobrança PIX (QR único)…
                  </p>
                ) : pixFailMessage ? (
                  <p className="modal__error">
                    <strong>Não foi possível montar o PIX:</strong>{' '}
                    {pixFailMessage}
                  </p>
                ) : canShowQr ? (
                  <>
                    <div className="modal__qr">
                      <div className="modal__qr-box">
                        <PixQrImage
                          emvBrCode={
                            pixMode === 'dynamic'
                              ? (dynamicBrCode ?? '')
                              : brCode
                          }
                          pngBase64={
                            pixMode === 'dynamic' ? dynamicQrPng : undefined
                          }
                        />
                      </div>
                    </div>
                    <p className="modal__hint">
                      Escaneie no app do banco
                      {brCode.trim() ? ' ou use copia e cola.' : '.'}
                    </p>
                    {brCode.trim() ? (
                      <button
                        type="button"
                        className="modal__copy"
                        onClick={copyCode}
                      >
                        {copied ? 'Código copiado!' : 'Copiar código PIX'}
                      </button>
                    ) : (
                      <p className="modal__hint">
                        Só há imagem QR nesta resposta; pague pelo scan no banco,
                        não há texto copia-e-cola disponível.
                      </p>
                    )}
                    <div className="modal__confirm-block">
                      <p className="modal__hint">
                        {pixMode === 'dynamic' ? (
                          <>
                            Este QR é de <strong>cobrança única</strong> (Mercado
                            Pago). Quando o pagamento for confirmado, o MP notifica
                            o webhook e a meta actualiza no site (Supabase).
                          </>
                        ) : (
                          <>
                            A meta <strong>não</strong> sobe só por gerar este
                            código. Quando o valor constar na vossa conta, o
                            vosso webhook (ou rotina) deve gravar o pagamento
                            como confirmado — a página reconsulta o Supabase de
                            poucos em poucos segundos.
                          </>
                        )}
                      </p>
                      {hasRemote && (
                        <button
                          type="button"
                          className="modal__copy"
                          onClick={() => void refresh()}
                        >
                          Atualizar progresso agora
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="modal__error">
                    Código PIX vazio. Confira o{' '}
                    <code className="inline-code">.env</code>.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
