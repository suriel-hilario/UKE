import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/pills.css'
import './styles/modal.css'
import './styles/forms.css'
import App from './App.tsx'
import { Auth0ProviderWithConfig } from './auth/Auth0ProviderWithConfig'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithConfig>
        <App />
      </Auth0ProviderWithConfig>
    </BrowserRouter>
  </StrictMode>,
)