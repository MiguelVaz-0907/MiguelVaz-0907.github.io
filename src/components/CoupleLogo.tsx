import { wedding } from '../config'

type Variant = 'hero' | 'nav' | 'banner'

type Props = {
  variant: Variant
  /** Primeira vista (herói) — eager + alta prioridade. */
  priority?: boolean
}

const classByVariant: Record<Variant, string> = {
  hero: 'couple-logo couple-logo--hero',
  nav: 'couple-logo couple-logo--nav',
  banner: 'couple-logo couple-logo--banner',
}

export function CoupleLogo({ variant, priority }: Props) {
  return (
    <img
      src={wedding.logoSrc}
      alt={variant === 'nav' ? '' : wedding.logoAlt}
      className={classByVariant[variant]}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}
