import type { EnhancedStore } from '@reduxjs/toolkit'

export let store: EnhancedStore

export const injectStore = (_store: EnhancedStore) => {
	store = _store
}
