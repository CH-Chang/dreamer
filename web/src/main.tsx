import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import { useSettingsStore } from './stores/settingsStore'
import './index.css'

useSettingsStore.getState().loadSettings()

const DEFAULT_GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '931072805115-92s5rot2jqavlrcoukpk1tqt8o2bslv1.apps.googleusercontent.com'

function Root() {
  const { settings } = useSettingsStore()
  const clientId = settings.googleClientId || DEFAULT_GOOGLE_CLIENT_ID

  return (
    <BrowserRouter basename="/dreamer">
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
