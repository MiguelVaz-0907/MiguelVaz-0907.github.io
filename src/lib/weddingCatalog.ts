import type { Gift, InvitedGuest } from '../config'
import { getSupabaseBrowserClient } from './supabaseClient'

export type WeddingGiftRow = {
  id: string
  title: string
  description: string
  price: number
  sort_order: number
}

export type WeddingGuestRow = {
  id: string
  name: string
  sort_order: number
}

function rowToGift(r: WeddingGiftRow): Gift {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    price: Number(r.price),
  }
}

function rowToGuest(r: WeddingGuestRow): InvitedGuest {
  return { id: r.id, name: r.name }
}

export async function fetchWeddingGiftsFromSupabase(): Promise<Gift[] | null> {
  const sb = getSupabaseBrowserClient()
  if (!sb) return null
  const { data, error } = await sb
    .from('wedding_gifts')
    .select('id,title,description,price,sort_order')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as WeddingGiftRow[]).map(rowToGift)
}

export async function fetchInvitedGuestsFromSupabase(): Promise<
  InvitedGuest[] | null
> {
  const sb = getSupabaseBrowserClient()
  if (!sb) return null
  const { data, error } = await sb
    .from('wedding_invited_guests')
    .select('id,name,sort_order')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as WeddingGuestRow[]).map(rowToGuest)
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const sb = getSupabaseBrowserClient()
  if (!sb) return false
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return false
  const { data, error } = await sb
    .from('app_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return false
  return Boolean(data)
}
