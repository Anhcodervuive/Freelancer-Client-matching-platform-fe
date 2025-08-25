import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'

// Cấu hình redux store
import { Provider } from 'react-redux'
import { store } from '~/redux/store'

// Cấu hình redux persist
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'

import AuthPage from './pages/Auth'
import HomePage from './pages/Comons/HomePage'
import { checkAuthenticatedUser, checkWhetherUserLoginMiddleware } from './middlewares/auth'
import { injectStore } from './utils/injectedStore'
import { routes } from './config/routes'

const persistor = persistStore(store)

injectStore(store)

const router = createBrowserRouter([
	{
		path: routes.comons.home,
		loader: checkAuthenticatedUser,
		element: <HomePage />
	},
	{
		path: routes.auth.signup,
		loader: checkWhetherUserLoginMiddleware,
		element: <AuthPage />
	},
	{
		path: routes.auth.signin,
		loader: checkWhetherUserLoginMiddleware,
		element: <AuthPage />
	}
])

function App() {
	return (
		<div className='font-display'>
			<Provider store={store}>
				<PersistGate persistor={persistor}>
					<RouterProvider router={router} />
				</PersistGate>
				<ToastContainer />
			</Provider>
		</div>
	)
}

export default App
