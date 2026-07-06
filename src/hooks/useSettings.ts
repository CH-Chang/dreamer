import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

export function useSettings() {
  const { settings, loadSettings, setSettings } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return { settings, setSettings }
}
