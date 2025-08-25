import { redirect } from 'react-router-dom'
import { routes } from '~/config/routes'
import type { UserState } from '~/redux/user/userSlice'
import { store } from '~/utils/injectedStore'

export const checkWhetherUserLoginMiddleware = () => {
	const user: UserState = store.getState().user

	if (user.currentUser) {
		throw redirect(routes.comons.home)
	}

	return null
}

export const checkAuthenticatedUser = () => {
	const user: UserState = store.getState().user

	if (!user.currentUser) {
		throw redirect(routes.auth.signin)
	}

	return null
}
