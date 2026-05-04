import { NavLink, Outlet } from 'react-router-dom'
import { CoupleLogo } from './CoupleLogo'
import { wedding } from '../config'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `site-nav__link${isActive ? ' site-nav__link--active' : ''}`

export function Layout() {
  return (
    <div className="app">
      <a href="#conteudo" className="skip-link">
        Saltar para o conteúdo
      </a>
      <nav className="site-nav" aria-label="Secções do site">
        <div className="site-nav__inner">
          <NavLink
            to="/"
            className="site-nav__brand site-nav__brand--logo"
            aria-label={`Início — ${wedding.names}`}
            end
          >
            <CoupleLogo variant="nav" priority />
          </NavLink>
          <div className="site-nav__links">
            <NavLink to="/" className={navClass} end>
              Início
            </NavLink>
            <NavLink to="/confirmar" className={navClass}>
              Confirmar presença
            </NavLink>
            <NavLink to="/presentes" className={navClass}>
              Presentes
            </NavLink>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
