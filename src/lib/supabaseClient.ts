import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null
  if (!client) client = createClient(url, key)
  return client
}

export function supabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.trim() &&
      import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(),
  )
}
