import { redirect } from 'react-router-dom'
import { routes } from '~/config/routes'

import type { LoaderFunctionArgs } from 'react-router-dom'

type Loader = (_args: LoaderFunctionArgs) => Promise<unknown> | unknown

export const composeLoaders =
	(...loaders: Loader[]) =>
	async (args: LoaderFunctionArgs) => {
		const out: Record<string, never> = {}
		for (const ld of loaders) {
			const res = await ld(args)
			// Nếu loader trả về Response (redirect/error) thì trả thẳng để Router xử lý
			if (res instanceof Response) return res
			if (res !== undefined) Object.assign(out, res)
		}
		return out // trở thành useLoaderData() của route đó
	}

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

export const requireAuthenticatedUserOrRedirectHome = () => {
        const persistedRoot = localStorage.getItem('persist:root')
        if (!persistedRoot) throw redirect(routes.comons.home)

        try {
                const state = JSON.parse(persistedRoot)
                const user = JSON.parse(state.user)
                if (!user.currentUser) throw redirect(routes.comons.home)
        } catch (error) {
                throw redirect(routes.comons.home)
        }

        return null
}

export const isFreelancerUser = () => {
	const persistedRoot = localStorage.getItem('persist:root')
	if (!persistedRoot) throw redirect(routes.auth.signin)
	const state = JSON.parse(persistedRoot)
	const user = JSON.parse(state.user)
	const currentUser = user.currentUser
	if (currentUser.role !== 'FREELANCER') {
		throw redirect(routes.comons.home)
	}
	return null
}

export const isClientUser = () => {
	const persistedRoot = localStorage.getItem('persist:root')
	if (!persistedRoot) throw redirect(routes.auth.signin)
	const state = JSON.parse(persistedRoot)
	const user = JSON.parse(state.user)
	const currentUser = user.currentUser
	if (currentUser.role !== 'CLIENT') {
		throw redirect(routes.comons.home)
	}
	return null
}

export const isAdminUser = () => {
	const persistedRoot = localStorage.getItem('persist:root')
	if (!persistedRoot) throw redirect(routes.auth.signin)
	const state = JSON.parse(persistedRoot)
	const user = JSON.parse(state.user)
	const currentUser = user.currentUser
	if (currentUser.role !== 'ADMIN') {
		throw redirect(routes.comons.home)
	}
	return null
}
