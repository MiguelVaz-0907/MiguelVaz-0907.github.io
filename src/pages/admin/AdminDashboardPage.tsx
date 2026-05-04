import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  formatRsvpReportDate,
  type RsvpResponseRow,
  rsvpAttendingLabel,
  rsvpRowsToCsv,
  summarizeRsvpRows,
} from '../../lib/rsvpResponses'
import { getSupabaseBrowserClient } from '../../lib/supabaseClient'
import type { WeddingGiftRow, WeddingGuestRow } from '../../lib/weddingCatalog'

function parsePrice(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function parseSort(s: string): number {
  const n = Number(s.trim())
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

export function AdminDashboardPage() {
  const sb = getSupabaseBrowserClient()
  const navigate = useNavigate()
  const [gifts, setGifts] = useState<WeddingGiftRow[]>([])
  const [guests, setGuests] = useState<WeddingGuestRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rsvpResponses, setRsvpResponses] = useState<RsvpResponseRow[]>([])
  const [rsvpLoadError, setRsvpLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [giftTitle, setGiftTitle] = useState('')
  const [giftDesc, setGiftDesc] = useState('')
  const [giftPrice, setGiftPrice] = useState('')
  const [giftSort, setGiftSort] = useState('0')
  const [giftEditingId, setGiftEditingId] = useState<string | null>(null)
  const [giftBusy, setGiftBusy] = useState(false)
  const [giftFormError, setGiftFormError] = useState<string | null>(null)

  const [guestName, setGuestName] = useState('')
  const [guestSort, setGuestSort] = useState('0')
  const [guestEditingId, setGuestEditingId] = useState<string | null>(null)
  const [guestBusy, setGuestBusy] = useState(false)
  const [guestFormError, setGuestFormError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!sb) return
    setLoadError(null)
    setRsvpLoadError(null)
    setLoading(true)
    try {
      const [gr, gu] = await Promise.all([
        sb
          .from('wedding_gifts')
          .select('id,title,description,price,sort_order')
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true }),
        sb
          .from('wedding_invited_guests')
          .select('id,name,sort_order')
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true }),
      ])
      if (gr.error) throw new Error(gr.error.message)
      if (gu.error) throw new Error(gu.error.message)
      setGifts((gr.data ?? []) as WeddingGiftRow[])
      setGuests((gu.data ?? []) as WeddingGuestRow[])

      const rv = await sb
        .from('rsvp_responses')
        .select(
          'id,full_name,email,phone,attending,guest_count,dietary_notes,message,created_at',
        )
        .order('created_at', { ascending: false })
      if (rv.error) {
        setRsvpLoadError(rv.error.message)
        setRsvpResponses([])
      } else {
        setRsvpResponses((rv.data ?? []) as RsvpResponseRow[])
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }, [sb])

  useEffect(() => {
    void reload()
  }, [reload])

  const downloadRsvpCsv = () => {
    if (rsvpResponses.length === 0) return
    const csv = rsvpRowsToCsv(rsvpResponses)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '-')
    a.href = url
    a.download = `confirmacoes-presenca-${stamp}.csv`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const logout = async () => {
    if (sb) await sb.auth.signOut()
    void navigate('/admin/login', { replace: true })
  }

  const resetGiftForm = () => {
    setGiftTitle('')
    setGiftDesc('')
    setGiftPrice('')
    setGiftSort('0')
    setGiftEditingId(null)
    setGiftFormError(null)
  }

  const startEditGift = (g: WeddingGiftRow) => {
    setGiftEditingId(g.id)
    setGiftTitle(g.title)
    setGiftDesc(g.description)
    setGiftPrice(String(g.price))
    setGiftSort(String(g.sort_order))
    setGiftFormError(null)
  }

  const saveGift = async (e: FormEvent) => {
    e.preventDefault()
    if (!sb) return
    setGiftFormError(null)
    const price = parsePrice(giftPrice)
    if (!giftTitle.trim()) {
      setGiftFormError('Indique o título do presente.')
      return
    }
    if (price === null) {
      setGiftFormError('Indique um preço válido (maior que zero).')
      return
    }
    const sort_order = parseSort(giftSort)
    setGiftBusy(true)
    try {
      if (giftEditingId) {
        const { error } = await sb
          .from('wedding_gifts')
          .update({
            title: giftTitle.trim(),
            description: giftDesc.trim(),
            price,
            sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', giftEditingId)
        if (error) throw new Error(error.message)
      } else {
        const id = crypto.randomUUID()
        const { error } = await sb.from('wedding_gifts').insert({
          id,
          title: giftTitle.trim(),
          description: giftDesc.trim(),
          price,
          sort_order,
        })
        if (error) throw new Error(error.message)
      }
      resetGiftForm()
      await reload()
    } catch (err) {
      setGiftFormError(
        err instanceof Error ? err.message : 'Não foi possível guardar.',
      )
    } finally {
      setGiftBusy(false)
    }
  }

  const deleteGift = async (id: string) => {
    if (!sb) return
    if (!window.confirm('Eliminar este presente? Os valores já pagos no Supabase mantêm o gift_id.'))
      return
    const { error } = await sb.from('wedding_gifts').delete().eq('id', id)
    if (error) {
      window.alert(error.message)
      return
    }
    if (giftEditingId === id) resetGiftForm()
    await reload()
  }

  const resetGuestForm = () => {
    setGuestName('')
    setGuestSort('0')
    setGuestEditingId(null)
    setGuestFormError(null)
  }

  const startEditGuest = (g: WeddingGuestRow) => {
    setGuestEditingId(g.id)
    setGuestName(g.name)
    setGuestSort(String(g.sort_order))
    setGuestFormError(null)
  }

  const saveGuest = async (e: FormEvent) => {
    e.preventDefault()
    if (!sb) return
    setGuestFormError(null)
    if (!guestName.trim()) {
      setGuestFormError('Indique o nome do convidado.')
      return
    }
    const sort_order = parseSort(guestSort)
    setGuestBusy(true)
    try {
      if (guestEditingId) {
        const { error } = await sb
          .from('wedding_invited_guests')
          .update({
            name: guestName.trim(),
            sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', guestEditingId)
        if (error) throw new Error(error.message)
      } else {
        const id = crypto.randomUUID()
        const { error } = await sb.from('wedding_invited_guests').insert({
          id,
          name: guestName.trim(),
          sort_order,
        })
        if (error) throw new Error(error.message)
      }
      resetGuestForm()
      await reload()
    } catch (err) {
      setGuestFormError(
        err instanceof Error ? err.message : 'Não foi possível guardar.',
      )
    } finally {
      setGuestBusy(false)
    }
  }

  const deleteGuest = async (id: string) => {
    if (!sb) return
    if (!window.confirm('Remover este convidado da lista?')) return
    const { error } = await sb.from('wedding_invited_guests').delete().eq('id', id)
    if (error) {
      window.alert(error.message)
      return
    }
    if (guestEditingId === id) resetGuestForm()
    await reload()
  }

  const rsvpSummary = summarizeRsvpRows(rsvpResponses)

  if (!sb) {
    return (
      <div className="admin-shell admin-panel">
        <p>Supabase não configurado.</p>
        <Link className="admin-link" to="/">
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <h1 className="admin-topbar__title">Administração</h1>
        <div className="admin-topbar__actions">
          <button type="button" className="admin-btn-ghost" onClick={() => void reload()}>
            Atualizar listas
          </button>
          <Link className="admin-btn-ghost admin-link-btn" to="/">
            Ver site
          </Link>
          <button type="button" className="admin-btn-ghost" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </header>

      {loadError ? (
        <div className="alert admin-alert" role="alert">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <p className="admin-muted">A carregar…</p>
      ) : (
        <>
          <section className="admin-section">
            <h2 className="admin-h2">Lista de presentes</h2>
            <p className="admin-section__hint">
              O identificador interno (id) dos presentes antigos não pode ser alterado aqui: evita desencontrar com o histórico de contribuições. Novos presentes recebem um id automático.
            </p>

            <form className="admin-form admin-form--inline" onSubmit={saveGift}>
              <h3 className="admin-h3">
                {giftEditingId ? 'Editar presente' : 'Novo presente'}
              </h3>
              {giftFormError ? (
                <div className="alert" role="alert">
                  {giftFormError}
                </div>
              ) : null}
              {giftEditingId ? (
                <p className="admin-muted">
                  <strong>Id:</strong> <code className="inline-code">{giftEditingId}</code>
                </p>
              ) : null}
              <label className="admin-label" htmlFor="g-title">
                Título
              </label>
              <input
                id="g-title"
                className="admin-input"
                value={giftTitle}
                onChange={(e) => setGiftTitle(e.target.value)}
              />
              <label className="admin-label" htmlFor="g-desc">
                Descrição
              </label>
              <textarea
                id="g-desc"
                className="admin-textarea"
                rows={2}
                value={giftDesc}
                onChange={(e) => setGiftDesc(e.target.value)}
              />
              <div className="admin-form-row">
                <div>
                  <label className="admin-label" htmlFor="g-price">
                    Preço (R$)
                  </label>
                  <input
                    id="g-price"
                    className="admin-input"
                    inputMode="decimal"
                    value={giftPrice}
                    onChange={(e) => setGiftPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-label" htmlFor="g-sort">
                    Ordem
                  </label>
                  <input
                    id="g-sort"
                    className="admin-input admin-input--narrow"
                    inputMode="numeric"
                    value={giftSort}
                    onChange={(e) => setGiftSort(e.target.value)}
                  />
                </div>
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn-primary" disabled={giftBusy}>
                  {giftBusy ? 'A guardar…' : giftEditingId ? 'Guardar alterações' : 'Adicionar presente'}
                </button>
                {giftEditingId || giftTitle || giftDesc || giftPrice ? (
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    onClick={resetGiftForm}
                  >
                    Limpar
                  </button>
                ) : null}
              </div>
            </form>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Título</th>
                  <th>Preço</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {gifts.map((g) => (
                  <tr key={g.id}>
                    <td>{g.sort_order}</td>
                    <td>
                      <strong>{g.title}</strong>
                      <div className="admin-table__sub">{g.description}</div>
                    </td>
                    <td>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(g.price))}
                    </td>
                    <td className="admin-table__actions">
                      <button
                        type="button"
                        className="admin-btn-small"
                        onClick={() => startEditGift(g)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="admin-btn-small admin-btn-small--danger"
                        onClick={() => void deleteGift(g.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {gifts.length === 0 ? (
              <p className="admin-muted">Ainda não há presentes na base de dados.</p>
            ) : null}
          </section>

          <section className="admin-section">
            <h2 className="admin-h2">Lista de convidados (RSVP)</h2>

            <form className="admin-form admin-form--inline" onSubmit={saveGuest}>
              <h3 className="admin-h3">
                {guestEditingId ? 'Editar convidado' : 'Novo convidado'}
              </h3>
              {guestFormError ? (
                <div className="alert" role="alert">
                  {guestFormError}
                </div>
              ) : null}
              {guestEditingId ? (
                <p className="admin-muted">
                  <strong>Id:</strong> <code className="inline-code">{guestEditingId}</code>
                </p>
              ) : null}
              <label className="admin-label" htmlFor="v-name">
                Nome (como no convite)
              </label>
              <input
                id="v-name"
                className="admin-input"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <label className="admin-label" htmlFor="v-sort">
                Ordem
              </label>
              <input
                id="v-sort"
                className="admin-input admin-input--narrow"
                inputMode="numeric"
                value={guestSort}
                onChange={(e) => setGuestSort(e.target.value)}
              />
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn-primary" disabled={guestBusy}>
                  {guestBusy ? 'A guardar…' : guestEditingId ? 'Guardar' : 'Adicionar'}
                </button>
                {guestEditingId || guestName ? (
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    onClick={resetGuestForm}
                  >
                    Limpar
                  </button>
                ) : null}
              </div>
            </form>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Nome</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td>{g.sort_order}</td>
                    <td>{g.name}</td>
                    <td className="admin-table__actions">
                      <button
                        type="button"
                        className="admin-btn-small"
                        onClick={() => startEditGuest(g)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="admin-btn-small admin-btn-small--danger"
                        onClick={() => void deleteGuest(g.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {guests.length === 0 ? (
              <p className="admin-muted">Ainda não há convidados na base de dados.</p>
            ) : null}
          </section>

          <section className="admin-section">
            <h2 className="admin-h2">Relatório de confirmações (RSVP)</h2>
            <p className="admin-section__hint">
              Submissões do site: resposta de presença, número de lugares indicado no formulário e data/hora de registo. Ordenação da mais recente para a mais antiga.
            </p>

            {rsvpLoadError ? (
              <div className="alert admin-alert" role="alert">
                <strong>Não foi possível carregar as confirmações:</strong> {rsvpLoadError}
                <p className="admin-muted admin-rsvp-migration-note">
                  Se o erro falar em permissões ou política RLS, execute no Supabase SQL
                  Editor o ficheiro{' '}
                  <code className="inline-code">supabase/migrations/005_admin_rsvp_read.sql</code>.
                </p>
              </div>
            ) : (
              <>
                <div className="admin-rsvp-summary" aria-live="polite">
                  <span>
                    <strong>{rsvpSummary.total}</strong> resposta(s) no total
                  </span>
                  <span className="admin-rsvp-summary__yes">
                    <strong>{rsvpSummary.yes}</strong> sim
                  </span>
                  <span className="admin-rsvp-summary__no">
                    <strong>{rsvpSummary.no}</strong> não
                  </span>
                  <span>
                    <strong>{rsvpSummary.maybe}</strong> talvez
                  </span>
                  <span className="admin-rsvp-summary__muted">
                    Lugares (respostas “sim”): <strong>{rsvpSummary.headsConfirmed}</strong>
                  </span>
                </div>
                <div className="admin-form-actions admin-rsvp-actions">
                  <button
                    type="button"
                    className="admin-btn-primary"
                    onClick={() => downloadRsvpCsv()}
                    disabled={rsvpResponses.length === 0}
                  >
                    Descarregar CSV (Excel)
                  </button>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Data do registo</th>
                        <th>Nome</th>
                        <th>Presença</th>
                        <th>Lugares</th>
                        <th>Email</th>
                        <th>Telefone</th>
                        <th>Notas / mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rsvpResponses.map((r) => (
                        <tr key={r.id}>
                          <td>{formatRsvpReportDate(r.created_at)}</td>
                          <td>
                            <strong>{r.full_name}</strong>
                          </td>
                          <td>{rsvpAttendingLabel(r.attending)}</td>
                          <td>{r.guest_count}</td>
                          <td className="admin-table__cell-clip" title={r.email ?? ''}>
                            {r.email ?? '—'}
                          </td>
                          <td className="admin-table__cell-clip" title={r.phone ?? ''}>
                            {r.phone ?? '—'}
                          </td>
                          <td
                            className="admin-table__cell-clip"
                            title={[r.dietary_notes, r.message]
                              .filter(Boolean)
                              .join(' — ') || undefined}
                          >
                            {[r.dietary_notes, r.message].filter(Boolean).join(' · ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rsvpResponses.length === 0 ? (
                  <p className="admin-muted">Ainda não há confirmações registadas.</p>
                ) : null}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
