import { PropsWithChildren } from 'react'
import { AppState, Auth0Provider } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'

export function Auth0ProviderWithConfig({ children }: PropsWithChildren) {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE
  const navigate = useNavigate()

  function onRedirectCallback(appState?: AppState) {
    navigate(appState?.returnTo ?? '/', { replace: true })
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        audience,
        redirect_uri: window.location.origin,
      }}
      cacheLocation="localstorage"
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  )
}