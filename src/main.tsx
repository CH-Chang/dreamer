import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import { useSettingsStore } from './stores/settingsStore'
import './index.css'

useSettingsStore.getState().loadSettings()

function Root() {
  const { settings } = useSettingsStore()
  return (
    <StrictMode>
      <BrowserRouter basename="/dreamer">
        {settings.googleClientId ? (
          <GoogleOAuthProvider clientId={settings.googleClientId}>
            <App />
          </GoogleOAuthProvider>
        ) : (
          <App />
        )}
      </BrowserRouter>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
