import { stripEnvQuotes } from './stripEnvQuotes'

/** CPF com dígitos verificadores válidos (evita confundir telefone 11 dígitos com CPF). */
function isValidCpfCheckDigits(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i)
  let d1 = (sum * 10) % 11
  if (d1 === 10) d1 = 0
  if (d1 !== Number(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i)
  let d2 = (sum * 10) % 11
  if (d2 === 10) d2 = 0
  return d2 === Number(digits[10])
}

/**
 * Ajusta a chave PIX para o formato esperado no BR Code.
 * Tem de coincidir com a chave **registada** no banco (e-mail, CPF só dígitos, telefone +55…, EVP).
 */
export function normalizePixKey(raw: string): string {
  let k = stripEnvQuotes(String(raw ?? '')).trim()
  if (!k) return k
  k = k.replace(/[\u200B-\u200D\uFEFF]/g, '')

  if (k.includes('@')) {
    return k.trim().toLowerCase()
  }

  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)
  ) {
    return k.toLowerCase()
  }

  const digits = k.replace(/\D/g, '')

  if (digits.length === 14) {
    return digits
  }

  if (digits.length === 11) {
    if (isValidCpfCheckDigits(digits)) {
      return digits
    }
    return `+55${digits}`
  }

  if (digits.length === 10) {
    return `+55${digits}`
  }

  if (
    digits.length >= 12 &&
    digits.length <= 13 &&
    digits.startsWith('55')
  ) {
    return `+${digits}`
  }

  return k.trim()
}
