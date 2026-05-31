import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Density = 'comfortable' | 'compact'

interface UiState {
  density: Density
  setDensity: (density: Density) => void
  toggleDensity: () => void
}

/** Global UI preferences (M19). Persisted so density survives a refresh. */
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
    }),
    { name: 'smartbrew-ui' },
  ),
)
