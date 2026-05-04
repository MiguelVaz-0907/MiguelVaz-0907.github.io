import { useCallback, useEffect, useState } from 'react'
import { gifts as fallbackGifts, type Gift } from '../config'
import {
  fetchWeddingGiftsFromSupabase,
} from '../lib/weddingCatalog'
import { supabaseConfigured } from '../lib/supabaseClient'

export function usePublicGifts() {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback')

  const refresh = useCallback(async () => {
    if (!supabaseConfigured()) {
      setGifts(fallbackGifts)
      setSource('fallback')
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const remote = await fetchWeddingGiftsFromSupabase()
      if (remote === null) {
        setGifts(fallbackGifts)
        setSource('fallback')
      } else {
        setGifts(remote)
        setSource('supabase')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar presentes.')
      setGifts(fallbackGifts)
      setSource('fallback')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { gifts, loading, error, source, refresh }
}
