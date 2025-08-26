import { createBrowserRouter } from 'react-router-dom'
import { routes } from '~/config/routes'
import { checkAuthenticatedUser, checkWhetherUserLoginMiddleware } from '~/middlewares/auth'
import AuthPage from '~/pages/Auth'
import HomePage from '~/pages/Comons/HomePage'
import NotFoundPage from '~/pages/Error/NotFoundPage'

export const router = createBrowserRouter([
	{
		path: routes.auth.signup,
		loader: checkWhetherUserLoginMiddleware,
		element: <AuthPage />
	},
	{
		path: routes.auth.signin,
		loader: checkWhetherUserLoginMiddleware,
		element: <AuthPage />
	},
	{
		path: routes.auth.verify,
		loader: checkWhetherUserLoginMiddleware,
		element: <AuthPage />
	},

	{
		path: routes.comons.home,
		loader: checkAuthenticatedUser,
		element: <HomePage />
	},

	// Error
	{
		path: '*',
		element: <NotFoundPage />
	}
])
