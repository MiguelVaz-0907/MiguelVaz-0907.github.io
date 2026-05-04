import { CoupleLogo } from '../components/CoupleLogo'
import { LeafDecoration } from '../components/LeafDecoration'
import { wedding } from '../config'

/** Formas orgânicas e traços tipo folha em SVG — mesma paleta e camadas da capa. */
function HomeDecor() {
  return (
    <div className="home-decor" aria-hidden>
      <svg className="home-decor__svg home-decor__svg--1" viewBox="0 0 200 200">
        <path
          fill="var(--sage)"
          opacity="0.14"
          d="M44.2 35C78 8 124 4 158 32c40 32 48 88 20 132-26 40-82 52-128 28C12 172-8 112 12 68 18 52 30 40 44 35z"
        />
      </svg>
      <svg className="home-decor__svg home-decor__svg--2" viewBox="0 0 200 200">
        <path
          fill="var(--sage-dark)"
          opacity="0.1"
          d="M160 48c18 42 10 94-24 124-38 34-96 36-134 4C-20 152-12 86 28 48 58 20 100 8 136 20c10 4 20 16 24 28z"
        />
      </svg>
      <svg className="home-decor__svg home-decor__svg--3" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--sage-light)" strokeWidth="1" opacity="0.35" />
        <circle cx="60" cy="60" r="36" fill="none" stroke="var(--sage-muted)" strokeWidth="0.75" opacity="0.45" />
      </svg>
      <svg className="home-decor__svg home-decor__leaf home-decor__leaf--a" viewBox="0 0 120 200">
        <path
          fill="var(--cream)"
          opacity="0.055"
          d="M62 188c-8 4-22-132-22-152 0-30 34-52 58-38 38 21 42 112-36 166z"
        />
        <path
          fill="none"
          stroke="var(--cream)"
          strokeWidth="0.9"
          opacity="0.12"
          d="M60 176V44m-12 104c36-44 54-108 46-154"
        />
      </svg>
      <svg className="home-decor__svg home-decor__leaf home-decor__leaf--b" viewBox="0 0 160 240">
        <path
          fill="var(--sage-light)"
          opacity="0.09"
          d="M80 226c18-94 88-174 68-218C138-38 62 16 62 102c0 74 8 142 18 124z"
        />
        <path
          fill="none"
          stroke="var(--sage-muted)"
          strokeWidth="0.75"
          opacity="0.22"
          d="M76 218c-8-158 40-276 74-294"
        />
      </svg>
      <svg className="home-decor__svg home-decor__leaf home-decor__leaf--c" viewBox="0 0 200 170">
        <ellipse cx="100" cy="78" rx="72" ry="38" transform="rotate(-28 100 78)" fill="var(--cream)" opacity="0.045" />
        <path
          fill="none"
          stroke="var(--cream)"
          strokeWidth="0.65"
          opacity="0.1"
          d="M36 118c62-118 154-154 206-154M52 138c108-92 208-126 274-146"
        />
      </svg>
      <svg className="home-decor__svg home-decor__leaf home-decor__leaf--d" viewBox="0 0 100 160">
        <path
          fill="var(--sage)"
          opacity="0.08"
          d="M50 150c14 0 8-118 22-146C92-42 44 8 32 112c0 52 4 38 18 38z"
        />
      </svg>
    </div>
  )
}

export function HomePage() {
  const mapsHref = wedding.mapsUrl?.trim()
  const photos = wedding.couplePhotos

  return (
    <>
      <header className="hero hero--home" aria-label="Capa do casamento">
        <HomeDecor />
        <div className="hero__texture" aria-hidden />
        <LeafDecoration variant="hero" />
        <div className="hero__frame hero__frame--wide">
          <p className="hero__eyebrow">Convidamos você para celebrar</p>
          <h1 className="hero__title-logo">
            <CoupleLogo variant="hero" priority />
          </h1>
          <p className="hero__date">{wedding.date}</p>
          <p className="hero__venue">{wedding.venue}</p>
          <p className="hero__time">{wedding.timeDetail}</p>
          <div className="hero__ornament" aria-hidden>
            <span className="hero__ring" />
            <span className="hero__ring hero__ring--second" />
          </div>
        </div>
      </header>

      <main id="conteudo" className="main home-main">
        <section className="home-photos home-photos--leafy" aria-label="Fotografias do casal">
          <LeafDecoration variant="photos" />
          <h2 className="home-section-title">Um pouco de nós</h2>
          <div className="home-photo-grid">
            {photos.map((p, i) => (
              <figure
                key={`${p.src}-${i}`}
                className={`home-photo-frame home-photo-frame--${(i % 3) + 1}`}
              >
                <img
                  className="home-photo-img"
                  src={p.src}
                  alt={p.alt}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        </section>

        <section className="home-details home-details--leafy" aria-label="Local e horário">
          <LeafDecoration variant="details" />
          <div className="home-details__card">
            <h2 className="home-details__title">Cerimónia e festa</h2>
            <dl className="home-details__list">
              <div className="home-details__row">
                <dt>Data</dt>
                <dd>{wedding.date}</dd>
              </div>
              <div className="home-details__row">
                <dt>Horário</dt>
                <dd>{wedding.timeDetail}</dd>
              </div>
              <div className="home-details__row">
                <dt>Local</dt>
                <dd>
                  <strong className="home-details__venue">{wedding.venueName}</strong>
                  <span className="home-details__address">{wedding.venueAddress}</span>
                </dd>
              </div>
            </dl>
            {mapsHref ? (
              <a
                className="home-details__map-btn"
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir no mapa
              </a>
            ) : (
              <p className="home-details__note">
                O link para o mapa será publicado aqui em breve.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Com carinho, {wedding.names}</p>
      </footer>
    </>
  )
}
