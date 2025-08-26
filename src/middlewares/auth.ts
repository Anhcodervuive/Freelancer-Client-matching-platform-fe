import { redirect } from 'react-router-dom'
import { routes } from '~/config/routes'

export const checkWhetherUserLoginMiddleware = () => {
	const persistedRoot = localStorage.getItem('persist:root')
	if (!persistedRoot) throw redirect(routes.comons.home)
	const state = JSON.parse(persistedRoot)
	const user = JSON.parse(state.user)
	if (user.currentUser) throw redirect(routes.comons.home)

	return null
}

export const checkAuthenticatedUser = () => {
	const persistedRoot = localStorage.getItem('persist:root')
	if (!persistedRoot) throw redirect(routes.auth.signin)
	const state = JSON.parse(persistedRoot)
	const user = JSON.parse(state.user)
	if (!user.currentUser) throw redirect(routes.auth.signin)

	return null
}
