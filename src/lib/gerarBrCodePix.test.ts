import { describe, expect, it } from 'vitest'
import { hasError, parsePix } from 'pix-utils'
import { gerarBrCodePix } from './gerarBrCodePix'

describe('gerarBrCodePix', () => {
  it('gera string EMV parseável sem erro de CRC', () => {
    const r = gerarBrCodePix({
      pixKey: 'teste@exemplo.com',
      merchantName: 'Fulano Silva',
      merchantCity: 'Sao Paulo',
      transactionAmount: 450,
      infoAdicional: 'Presente: Jogo',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.brCode.length).toBeGreaterThan(80)
    expect(r.brCode.startsWith('00020126')).toBe(true)

    const parsed = parsePix(r.brCode)
    expect(hasError(parsed)).toBe(false)
  })

  it('rejeita cidade com mais de 15 caracteres (regra pix-utils)', () => {
    const r = gerarBrCodePix({
      pixKey: 'teste@exemplo.com',
      merchantName: 'Fulano',
      merchantCity: 'Nome De Cidade Muito Grande',
      transactionAmount: 10,
      infoAdicional: 'X',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.message).toMatch(/15/i)
  })
})
