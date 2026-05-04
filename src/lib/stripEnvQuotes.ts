/** Remove aspas comuns do .env (ex.: VITE_PIX_KEY="email@x.com"). */
export function stripEnvQuotes(value: string): string {
  const t = value.trim()
  if (t.length >= 2) {
    const q = t[0]
    if ((q === '"' || q === "'") && t[t.length - 1] === q) {
      return t.slice(1, -1).trim()
    }
  }
  return t
}
