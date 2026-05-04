import { wedding } from '../config'

type LeafVariant = 'hero' | 'banner' | 'photos' | 'details'

export function LeafDecoration({ variant }: { variant: LeafVariant }) {
  const src = wedding.decorationLeafSrc?.trim()
  if (!src) return null

  if (variant === 'hero') {
    return (
      <>
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--hero-tl"
          width={280}
          height={280}
          decoding="async"
          aria-hidden
        />
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--hero-br"
          width={220}
          height={220}
          decoding="async"
          aria-hidden
        />
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--hero-tr"
          width={200}
          height={200}
          decoding="async"
          aria-hidden
        />
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--hero-bl"
          width={180}
          height={180}
          decoding="async"
          aria-hidden
        />
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--hero-accent-tr"
          width={140}
          height={140}
          decoding="async"
          aria-hidden
        />
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--hero-accent-bl"
          width={130}
          height={130}
          decoding="async"
          aria-hidden
        />
      </>
    )
  }

  if (variant === 'photos') {
    return (
      <>
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--photos-tl"
          width={140}
          height={140}
          decoding="async"
          aria-hidden
        />
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--photos-tr"
          width={120}
          height={120}
          decoding="async"
          aria-hidden
        />
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--photos-bl"
          width={150}
          height={150}
          decoding="async"
          aria-hidden
        />
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--photos-br"
          width={110}
          height={110}
          decoding="async"
          aria-hidden
        />
      </>
    )
  }

  if (variant === 'details') {
    return (
      <>
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--details-l"
          width={120}
          height={120}
          decoding="async"
          aria-hidden
        />
        <img
          src={src}
          alt=""
          className="leaf-decor leaf-decor--details-r"
          width={110}
          height={110}
          decoding="async"
          aria-hidden
        />
      </>
    )
  }

  return (
    <>
      <img
        src={src}
        alt=""
        className="leaf-decor leaf-decor--banner leaf-decor--banner-right"
        width={200}
        height={200}
        decoding="async"
        aria-hidden
      />
      <img
        src={src}
        alt=""
        className="leaf-decor leaf-decor--banner leaf-decor--banner-left"
        width={170}
        height={170}
        decoding="async"
        aria-hidden
      />
      <img
        src={src}
        alt=""
        className="leaf-decor leaf-decor--banner leaf-decor--banner-soft"
        width={120}
        height={120}
        decoding="async"
        aria-hidden
      />
    </>
  )
}
