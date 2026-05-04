import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getSupabaseBrowserClient } from '../lib/supabaseClient'
import { isCurrentUserAdmin } from '../lib/weddingCatalog'

type Status = 'loading' | 'ok' | 'no-session' | 'forbidden'

export function AdminRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const sb = getSupabaseBrowserClient()
      if (!sb) {
        if (!cancelled) setStatus('no-session')
        return
      }
      const {
        data: { session },
      } = await sb.auth.getSession()
      if (!session) {
        if (!cancelled) setStatus('no-session')
        return
      }
      const admin = await isCurrentUserAdmin()
      if (cancelled) return
      setStatus(admin ? 'ok' : 'forbidden')
    })()
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (status === 'loading') {
    return (
      <div className="admin-shell">
        <p className="admin-muted">A verificar sessão…</p>
      </div>
    )
  }

  if (status === 'no-session') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  if (status === 'forbidden') {
    return (
      <div className="admin-shell admin-panel">
        <h1 className="admin-h1">Sem permissão</h1>
        <p className="admin-muted">
          Esta conta não está na lista de administradores. No Supabase, execute:{' '}
          <code className="inline-code">
            insert into app_admins (user_id) values (&apos;…uuid…&apos;);
          </code>
        </p>
        <a className="admin-link" href="/admin/login">
          Voltar ao login
        </a>
      </div>
    )
  }

  return <>{children}</>
}
