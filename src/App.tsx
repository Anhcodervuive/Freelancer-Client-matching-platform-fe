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
import NotFoundPage from './pages/Error/NotFoundPage'
import CommonLayout from './layouts/CommonLayout'
import AdminLayout from './layouts/AdminLayout'
import AdminProjects from './pages/Admin/AdminProjects'
import ProfilePage from './pages/Me/ProfilePage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SettingLayout from './layouts/SettingLayout'
import ContactInfo from './pages/Me/ContactInfo'
import PaymentMethodPage from './pages/Me/payment-method/PaymentMethodPage'
import AddBillingMethodPage from './pages/Me/payment-method/AddPaymentMethodPage'
import PaymentMethodWrapper from './pages/Me/payment-method/PaymentMethodWrapper'
import EditPaymentMethod from './pages/Me/payment-method/EditPaymentMethod'

const persistor = persistStore(store)

const qc = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false, // Không tự refetch khi đổi tab
			retry: false, // Thử lại tối đa 2 lần khi lỗi
			staleTime: 1000 * 60 * 5 // Cache "tươi" trong 5 phút
		},
		mutations: {
			retry: false // Số lần retry cho mutation
		}
	}
})

injectStore(store)

const router = createBrowserRouter([
	// Common
	{
		element: <CommonLayout />,
		children: [
			{
				path: routes.comons.home,
				element: <HomePage />
			},
			{
				path: routes.me.freelancer.profile,
				element: <ProfilePage />
			},
			{
				path: '/me/setting',
				loader: checkAuthenticatedUser,
				element: <SettingLayout />,
				children: [
					{
						path: 'contact-info',
						element: <ContactInfo />
					}
				]
			},
			{
				path: '/me/setting/payment-method',
				element: <PaymentMethodWrapper />,
				children: [
					{
						path: '',
						element: <PaymentMethodPage />
					},
					{
						path: 'create',
						element: <AddBillingMethodPage />
					},
					{
						path: 'edit/:id',
						element: <EditPaymentMethod />
					}
				]
			}
		]
	},
	// Admin
	{
		path: '/admin',
		loader: checkAuthenticatedUser,
		element: <AdminLayout />,
		children: [
			{
				path: 'projects',
				element: <AdminProjects />
			}
		]
	},
	// Auth
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

	// Error
	{
		path: '*',
		element: <NotFoundPage />
	}
])

function App() {
	return (
		<div className='font-display'>
			<QueryClientProvider client={qc}>
				<Provider store={store}>
					<PersistGate persistor={persistor}>
						<RouterProvider router={router} />
					</PersistGate>
					<ToastContainer />
				</Provider>
			</QueryClientProvider>
		</div>
	)
}

export default App
