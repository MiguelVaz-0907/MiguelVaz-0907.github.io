import { describe, expect, it } from 'vitest'
import { normalizePixKey } from './normalizePixKey'

describe('normalizePixKey', () => {
  it('lowercases email', () => {
    expect(normalizePixKey('  Teste@Email.COM  ')).toBe('teste@email.com')
  })

  it('adds +55 to 11-digit mobile when not a valid CPF', () => {
    expect(normalizePixKey('11988887777')).toBe('+5511988887777')
  })

  it('keeps CPF as 11 digits when valid check digits', () => {
    expect(normalizePixKey('529.982.247-25')).toBe('52998224725')
  })

  it('prefixes + when BR country code present without plus', () => {
    expect(normalizePixKey('5511988887777')).toBe('+5511988887777')
  })
})
