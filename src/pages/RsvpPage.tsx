import { type FormEvent, useMemo, useState } from 'react'
import { CoupleLogo } from '../components/CoupleLogo'
import { LeafDecoration } from '../components/LeafDecoration'
import { type InvitedGuest, wedding } from '../config'
import { usePublicInvitedGuests } from '../hooks/usePublicInvitedGuests'
import {
  formatRsvpForMessage,
  submitRsvpToSupabase,
  type RsvpPayload,
} from '../lib/submitRsvp'
import { supabaseConfigured } from '../lib/supabaseClient'

function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function RsvpPage() {
  const { guests: invitedGuests, loading: guestsLoading, error: guestsError } =
    usePublicInvitedGuests()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<InvitedGuest | null>(null)
  const [attending, setAttending] = useState<'yes' | 'no' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [copiedLocal, setCopiedLocal] = useState(false)

  const remote = supabaseConfigured()

  const qNorm = normalizeForSearch(query)
  const matches = useMemo(() => {
    if (qNorm.length < 2) return []
    return invitedGuests.filter((g) =>
      normalizeForSearch(g.name).includes(qNorm),
    )
  }, [qNorm, invitedGuests])

  const canSubmit = Boolean(selected && attending !== null)

  const onPickGuest = (guest: InvitedGuest) => {
    setSelected(guest)
    setAttending(null)
    setError(null)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selected || attending === null) {
      setError('Escolha o seu nome na lista e indique se vai comparecer.')
      return
    }

    const payload: RsvpPayload = {
      full_name: selected.name,
      attending,
      guest_count: attending === 'yes' ? 1 : 0,
    }

    setBusy(true)
    try {
      if (remote) {
        const res = await submitRsvpToSupabase(payload)
        if (!res.ok) {
          setError(res.message)
          return
        }
      } else {
        const text = formatRsvpForMessage(payload, wedding.names)
        await navigator.clipboard.writeText(text)
        setCopiedLocal(true)
        window.setTimeout(() => setCopiedLocal(false), 2400)
      }
      setDone(true)
      setQuery('')
      setSelected(null)
      setAttending(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar. Tente outra vez.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="page-hero page-hero--decor" aria-label="Confirmar presença">
        <LeafDecoration variant="banner" />
        <div className="page-hero__inner">
          <div className="page-hero__eyebrow page-hero__eyebrow--logo">
            <CoupleLogo variant="banner" />
          </div>
          <h1 className="page-hero__title">Confirmar presença</h1>
          <p className="page-hero__lead">
            Procure o seu nome na lista e diga-nos se vem à festa. {wedding.date},{' '}
            {wedding.timeDetail}.
          </p>
        </div>
      </header>

      <main id="conteudo" className="main rsvp-main">
        {done ? (
          <div className="rsvp-success" role="status">
            <h2 className="rsvp-success__title">Obrigado!</h2>
            <p className="rsvp-success__text">
              {remote
                ? 'Registámos a vossa resposta. Se precisarem de alterar algo, enviem mensagem aos noivos.'
                : 'Copiámos o texto da confirmação para a área de transferência — cole numa mensagem para os noivos.'}
            </p>
            {copiedLocal ? (
              <p className="rsvp-success__copied">Texto copiado.</p>
            ) : null}
            <button
              type="button"
              className="rsvp-success__again"
              onClick={() => {
                setDone(false)
                setError(null)
              }}
            >
              Confirmar outra resposta
            </button>
          </div>
        ) : guestsLoading ? (
          <p className="rsvp-hint" role="status">
            A carregar a lista de convidados…
          </p>
        ) : (
          <form className="rsvp-form" onSubmit={onSubmit} noValidate>
            {guestsError ? (
              <div className="alert" role="alert">
                <strong>Lista:</strong> {guestsError} (a usar lista local de
                reserva, se existir.)
              </div>
            ) : null}
            {invitedGuests.length === 0 ? (
              <p className="rsvp-hint rsvp-hint--warn" role="status">
                A lista de convidados está vazia. Adicionem entradas no painel{' '}
                <strong>/admin</strong> ou em <code className="inline-code">config.ts</code>{' '}
                (modo sem Supabase).
              </p>
            ) : null}

            {!remote ? (
              <p className="rsvp-form__notice" role="note">
                <strong>Nota:</strong> sem Supabase configurado, ao confirmar o
                texto é <strong>copiado</strong> para colarem numa mensagem. Com
                Supabase, a resposta fica guardada automaticamente (execute{' '}
                <code className="inline-code">002_rsvp_responses.sql</code>).
              </p>
            ) : null}

            {error ? (
              <div className="alert" role="alert">
                {error}
              </div>
            ) : null}

            <div className="rsvp-field">
              <label className="rsvp-label" htmlFor="rsvp-search">
                O seu nome na lista de convidados
              </label>
              <input
                id="rsvp-search"
                className="rsvp-input"
                type="search"
                autoComplete="off"
                placeholder="Comece a escrever… (mínimo 2 letras)"
                value={query}
                onChange={(e) => {
                  const next = e.target.value
                  setQuery(next)
                  setError(null)
                  const n = normalizeForSearch(next)
                  if (n.length < 2) {
                    setSelected(null)
                    setAttending(null)
                    return
                  }
                  if (selected) {
                    const g = invitedGuests.find((x) => x.id === selected.id)
                    const visible =
                      g !== undefined &&
                      normalizeForSearch(g.name).includes(n)
                    if (!visible) {
                      setSelected(null)
                      setAttending(null)
                    }
                  }
                }}
              />
            </div>

            {qNorm.length >= 2 && matches.length === 0 ? (
              <p className="rsvp-hint rsvp-hint--warn" role="status">
                Não encontrámos esse nome na lista. Experimente outra grafia ou
                contacte os noivos.
              </p>
            ) : null}

            {matches.length > 0 ? (
              <div className="rsvp-guest-block">
                <p className="rsvp-guest-block__title">Resultados</p>
                <ul className="rsvp-guest-list" role="listbox" aria-label="Convidados">
                  {matches.map((g) => {
                    const active = selected?.id === g.id
                    return (
                      <li key={g.id}>
                        <button
                          type="button"
                          className={`rsvp-guest-item${active ? ' rsvp-guest-item--active' : ''}`}
                          role="option"
                          aria-selected={active}
                          onClick={() => onPickGuest(g)}
                        >
                          {g.name}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : qNorm.length >= 2 ? null : (
              <p className="rsvp-hint">
                Escreva pelo menos duas letras para aparecerem os nomes da lista.
              </p>
            )}

            {selected ? (
              <div className="rsvp-picked">
                <p className="rsvp-picked__label">A confirmar para</p>
                <p className="rsvp-picked__name">{selected.name}</p>
                <fieldset className="rsvp-fieldset rsvp-fieldset--inline">
                  <legend className="rsvp-label">Vai comparecer?</legend>
                  <div className="rsvp-choice-row">
                    <button
                      type="button"
                      className={`rsvp-choice${attending === 'yes' ? ' rsvp-choice--on' : ''}`}
                      onClick={() => {
                        setAttending('yes')
                        setError(null)
                      }}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      className={`rsvp-choice${attending === 'no' ? ' rsvp-choice--on' : ''}`}
                      onClick={() => {
                        setAttending('no')
                        setError(null)
                      }}
                    >
                      Não
                    </button>
                  </div>
                </fieldset>
              </div>
            ) : null}

            <button
              type="submit"
              className="rsvp-submit"
              disabled={busy || !canSubmit}
            >
              {busy
                ? 'A enviar…'
                : remote
                  ? 'Enviar confirmação'
                  : 'Gerar texto e copiar'}
            </button>
          </form>
        )}
      </main>

      <footer className="footer">
        <p>Com carinho, {wedding.names}</p>
      </footer>
    </>
  )
}
