import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Density = 'comfortable' | 'compact'
export type Theme = 'light' | 'dark'

interface UiState {
  density: Density
  setDensity: (density: Density) => void
  toggleDensity: () => void
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/** The OS preference, used only on first ever load (before anything is stored). */
function systemTheme(): Theme {
  // Guard matchMedia — it's absent in jsdom (tests) and very old engines.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Reflect the theme onto <html data-theme> so the CSS token overrides apply. */
function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme
}

/** Global UI preferences (M19). Persisted so density + theme survive a refresh. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      density: 'comfortable',
      setDensity: (density) => {
        set({ density })
      },
      toggleDensity: () => {
        set((s) => ({ density: s.density === 'comfortable' ? 'compact' : 'comfortable' }))
      },
      theme: systemTheme(),
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      toggleTheme: () => {
        set((s) => {
          const theme: Theme = s.theme === 'dark' ? 'light' : 'dark'
          applyTheme(theme)
          return { theme }
        })
      },
    }),
    {
      name: 'smartbrew-ui',
      // Re-apply the rehydrated theme so <html> matches the stored preference.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
