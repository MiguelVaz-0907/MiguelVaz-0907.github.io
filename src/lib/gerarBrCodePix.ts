import { createStaticPix, hasError, type PixError } from 'pix-utils'

export type GerarBrCodeParams = {
  pixKey: string
  merchantName: string
  merchantCity: string
  transactionAmount: number
  infoAdicional: string
}

export type GerarBrCodeResult =
  | { ok: true; brCode: string }
  | { ok: false; message: string }

export function gerarBrCodePix(params: GerarBrCodeParams): GerarBrCodeResult {
  const pix = createStaticPix({
    pixKey: params.pixKey,
    merchantName: params.merchantName,
    merchantCity: params.merchantCity,
    transactionAmount: params.transactionAmount,
    infoAdicional: params.infoAdicional,
    isTransactionUnique: false,
  })
  if (hasError(pix)) {
    return { ok: false, message: (pix as PixError).message }
  }
  return { ok: true, brCode: pix.toBRCode() }
}
