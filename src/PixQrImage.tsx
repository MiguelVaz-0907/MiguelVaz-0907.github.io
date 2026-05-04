import { useEffect, useState } from 'react'

import QRCode from 'qrcode'



type Props = {

  /** Payload EMV PIX (copia-e-cola). */

  emvBrCode: string

  /** Imagem PNG em base64 cru, quando o Mercado Pago envia só qr_code_base64. */

  pngBase64?: string | null

}



export function PixQrImage({ emvBrCode, pngBase64 }: Props) {

  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)



  useEffect(() => {

    let alive = true

    setDataUrl(null)

    setError(null)



    if (pngBase64 && pngBase64.trim() !== '') {

      setDataUrl(`data:image/png;base64,${pngBase64.trim()}`)

      return () => {

        alive = false

      }

    }



    const emv = emvBrCode.trim()

    if (!emv) {

      setError('Código PIX em branco.')

      return () => {

        alive = false

      }

    }



    QRCode.toDataURL(emv, {

      errorCorrectionLevel: 'H',

      width: 240,

      margin: 2,

      color: { dark: '#1a1c15', light: '#ffffff' },

    })

      .then((url) => {

        if (alive) setDataUrl(url)

      })

      .catch((e: unknown) => {

        if (alive) setError(e instanceof Error ? e.message : 'Falha ao gerar o QR')

      })



    return () => {

      alive = false

    }

  }, [emvBrCode, pngBase64])



  if (error) {

    return (

      <p className="modal__error" role="alert">

        Não foi possível desenhar o QR. Tente usar{' '}

        <strong>Copiar código PIX</strong> abaixo. ({error})

      </p>

    )

  }



  if (!dataUrl) {

    return <p className="modal__hint">Gerando QR…</p>

  }



  return (

    <img

      className="modal__qr-img"

      src={dataUrl}

      alt="QR Code para pagamento PIX"

      width={240}

      height={240}

      decoding="async"

    />

  )

}


