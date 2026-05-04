import { useCallback, useEffect, useState } from 'react'
import { roundBRL } from './lib/giftFunding'
import { getSupabaseBrowserClient, supabaseConfigured } from './lib/supabaseClient'

const POLL_MS = 12_000

export function useConfirmedFunding() {
  const hasRemote = supabaseConfigured()
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(hasRemote)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const sb = getSupabaseBrowserClient()
    if (!sb) {
      setTotals({})
      setLoading(false)
      setFetchError(null)
      return
    }

    const { data, error } = await sb
      .from('gift_contributions')
      .select('gift_id, amount')
      .eq('payment_status', 'paid')

    if (error) {
      setFetchError(error.message)
      setTotals({})
      setLoading(false)
      return
    }

    const map: Record<string, number> = {}
    for (const row of data ?? []) {
      const id = String(row.gift_id)
      const add = Number(row.amount)
      if (!Number.isFinite(add)) continue
      map[id] = roundBRL((map[id] ?? 0) + add)
    }
    setTotals(map)
    setFetchError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    if (!hasRemote) return
    const id = window.setInterval(() => void refresh(), POLL_MS)
    return () => window.clearInterval(id)
  }, [hasRemote, refresh])

  const getRaised = useCallback(
    (giftId: string) => totals[giftId] ?? 0,
    [totals],
  )

  return { getRaised, loading, fetchError, hasRemote, refresh }
}
