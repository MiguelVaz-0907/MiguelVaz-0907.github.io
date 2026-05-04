import { FunctionsHttpError } from '@supabase/supabase-js'

/**
 * O `functions.invoke()` devolve `data: null` quando o HTTP não é 2xx (`FunctionsHttpError`).
 * O texto útil está no corpo da `Response` em `error.context`.
 */
export async function readFunctionsHttpBody(
  error: unknown,
): Promise<{ message: string; status: number | null } | null> {
  if (!(error instanceof FunctionsHttpError)) return null
  const raw = error.context
  if (!raw || typeof (raw as Response).text !== 'function') return null

  let status: number | null = null
  try {
    status =
      typeof (raw as Response).status === 'number'
        ? (raw as Response).status
        : null
  } catch {
    status = null
  }

  try {
    const text = await (raw as Response).clone().text()
    const trimmed = text.trim()
    if (!trimmed)
      return { message: `(HTTP ${status ?? '?'}) corpo vazio`, status }

    try {
      const parsed = JSON.parse(trimmed) as {
        error?: string
        message?: string
      }
      const msg =
        (typeof parsed.error === 'string' && parsed.error) ||
        (typeof parsed.message === 'string' && parsed.message) ||
        trimmed.slice(0, 280)
      return { message: msg, status }
    } catch {
      return { message: trimmed.slice(0, 280), status }
    }
  } catch {
    return null
  }
}
