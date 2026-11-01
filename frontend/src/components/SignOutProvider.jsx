import { useCallback, useRef } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { SignOutContext, beginSignOut } from '../lib/signOut.js'
import { configureConvexSession } from '../lib/api.js'
import { getConvexClient, detachConvexClient } from '../lib/convexClient.js'
import { navigateApp } from '../lib/routes.js'

export default function SignOutProvider({ storage, children }) {
  const { signOut: revoke } = useAuthActions()
  const started = useRef(false)
  const signOut = useCallback(() => {
    if (started.current) return
    started.current = true
    const client = getConvexClient()
    beginSignOut({ revoke, storage,
      clearSession: () => configureConvexSession(null),
      detach: () => detachConvexClient(client),
      goHome: () => navigateApp('/', {replace: true}),
      dispose: () => client.close?.(),
    })
  }, [revoke, storage])
  return <SignOutContext.Provider value={signOut}>{children}</SignOutContext.Provider>
}
