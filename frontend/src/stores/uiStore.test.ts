import { beforeEach, describe, expect, it } from 'vitest'

import { useUiStore } from '@/stores/uiStore'

beforeEach(() => {
  useUiStore.setState({ density: 'comfortable' })
})

describe('uiStore', () => {
  it('toggles density between comfortable and compact', () => {
    expect(useUiStore.getState().density).toBe('comfortable')
    useUiStore.getState().toggleDensity()
    expect(useUiStore.getState().density).toBe('compact')
    useUiStore.getState().toggleDensity()
    expect(useUiStore.getState().density).toBe('comfortable')
  })

  it('setDensity sets a specific value', () => {
    useUiStore.getState().setDensity('compact')
    expect(useUiStore.getState().density).toBe('compact')
  })
})
