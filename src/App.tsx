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
import {
	checkAuthenticatedUser,
	checkWhetherUserLoginMiddleware,
	composeLoaders,
	isAdminUser,
	isClientUser,
	requireAuthenticatedUserOrRedirectHome
} from './middlewares/auth'
import { injectStore } from './utils/injectedStore'
import { routes } from './config/routes'
import NotFoundPage from './pages/Error/NotFoundPage'
import CommonLayout from './layouts/CommonLayout'
import AdminLayout from './layouts/AdminLayout'
import JobChatLayout from './layouts/JobChatLayout'
import AdminProjects from './pages/Admin/AdminProjects'
import ProfilePage from './pages/Me/ProfilePage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SettingLayout from './layouts/SettingLayout'
import ContactInfo from './pages/Me/ContactInfo'
import GetPaidPage from './pages/Me/get-paid/GetPaidPage'
import PaymentMethodPage from './pages/Me/payment-method/PaymentMethodPage'
import AddBillingMethodPage from './pages/Me/payment-method/AddPaymentMethodPage'
import PaymentMethodWrapper from './pages/Me/payment-method/PaymentMethodWrapper'
import EditPaymentMethod from './pages/Me/payment-method/EditPaymentMethod'
import CategoryList from './pages/Admin/category/List'
import SpecialtiesGlobal from './pages/Admin/specialty/List'
import CategorySpecialtiesPage from './pages/Admin/category/CategorySpecialties'
import SkillsAdminPage from './pages/Admin/skill/List'
import CategorySkillsPage from './pages/Admin/category/CategorySkillsPage'
import SpecialtySkillsPage from './pages/Admin/specialty/SpecialtySkillPage'
import OnboardingWizard from './pages/onBoarding/OnboardingWizard'
import PolicyLayout from './layouts/PolicyLayout'
import ConnectAccountPolicyPage from './pages/Comons/policies/ConnectAccountPolicyPage'
import PostJobWizard from './pages/Client/PostJob/PostJobWizard'
import JobPostListPage from './pages/Client/JobPosts/JobPostListPage'
import JobPostDetailPage from './pages/Client/JobPosts/JobPostDetailPage'
import JobMarketplacePage from './pages/Freelancer/Jobs/JobMarketplacePage'
import SavedJobsPage from './pages/Freelancer/Jobs/SavedJobsPage'
import JobMarketplaceDetailPage from './pages/Freelancer/Jobs/JobMarketplaceDetailPage'
import JobProposalsPage from './pages/Freelancer/Jobs/JobProposalsPage'
import SubmitJobProposalPage from './pages/Freelancer/Jobs/SubmitJobProposalPage'
import EditJobProposalPage from './pages/Freelancer/Jobs/EditJobProposalPage'
import ClientFreelancerListPage from './pages/Client/Freelancers/ClientFreelancerListPage'
import JobChatPage from './pages/Comons/Chat/JobChatPage'
import { ChatSocketProvider } from '~/contexts/chat-socket/ChatSocketProvider'

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
				path: routes.freelancer.jobs.list,
				loader: requireAuthenticatedUserOrRedirectHome,
				element: <JobMarketplacePage />
			},
			{
				path: routes.freelancer.jobs.saved,
				loader: requireAuthenticatedUserOrRedirectHome,
				element: <SavedJobsPage />
			},
			{
				path: routes.freelancer.jobs.invitations,
				loader: requireAuthenticatedUserOrRedirectHome,
				element: <JobProposalsPage />
			},
			{
				path: routes.freelancer.jobs.invitationDetail(':invitationId'),
				loader: requireAuthenticatedUserOrRedirectHome,
				element: <JobProposalsPage />
			},
			{
				path: routes.freelancer.jobs.proposalEdit(':proposalId'),
				loader: requireAuthenticatedUserOrRedirectHome,
				element: <EditJobProposalPage />
			},
			{
				path: routes.freelancer.jobs.proposalCreate(':jobId'),
				loader: requireAuthenticatedUserOrRedirectHome,
				element: <SubmitJobProposalPage />
			},
			{
				path: routes.freelancer.jobs.detail(':jobId'),
				loader: requireAuthenticatedUserOrRedirectHome,
				element: <JobMarketplaceDetailPage />
			},
			{
				path: routes.client.freelancers.list,
				loader: composeLoaders(checkAuthenticatedUser, isClientUser),
				element: <ClientFreelancerListPage />
			},
			{
				path: routes.me.freelancer.profile,
				loader: checkAuthenticatedUser,
				element: <ProfilePage />
			},
			{
				path: 'freelancer/:id',
				loader: requireAuthenticatedUserOrRedirectHome,
				element: <ProfilePage />
			},
			{
				path: routes.comons.onboarding,
				element: <OnboardingWizard />
			},
			{
				path: routes.me.client.jobs.list,
				loader: composeLoaders(checkAuthenticatedUser, isClientUser),
				element: <JobPostListPage />
			},
			{
				path: routes.me.client.jobs.create,
				loader: composeLoaders(checkAuthenticatedUser, isClientUser),
				element: <PostJobWizard />
			},
			{
				path: routes.me.client.jobs.detail(':jobId'),
				loader: composeLoaders(checkAuthenticatedUser, isClientUser),
				element: <JobPostDetailPage />
			},
			{
				path: routes.me.client.jobs.edit(':jobId'),
				loader: composeLoaders(checkAuthenticatedUser, isClientUser),
				element: <PostJobWizard />
			},
			{
				path: '/me/setting',
				loader: checkAuthenticatedUser,
				element: <SettingLayout />,
				children: [
					{
						path: 'contact-info',
						element: <ContactInfo />
					},
					{
						path: 'get-paid',
						element: <GetPaidPage />
					}
				]
			},
			{
				path: 'policies',
				element: <PolicyLayout />,
				children: [
					{
						index: true,
						element: <ConnectAccountPolicyPage />
					},
					{
						path: 'connect-account',
						element: <ConnectAccountPolicyPage />
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
	// Job chat workspace (full-width layout)
	{
		path: routes.messages.jobs,
		loader: requireAuthenticatedUserOrRedirectHome,
		element: <JobChatLayout />,
		children: [
			{
				index: true,
				element: <JobChatPage />
			}
		]
	},
	// Admin
	{
		path: '/admin',
		loader: composeLoaders(checkAuthenticatedUser, isAdminUser),
		element: <AdminLayout />,
		children: [
			{
				path: 'projects',
				element: <AdminProjects />
			},
			{
				path: 'categories',
				children: [
					{
						path: '',
						element: <CategoryList />
					},
					{
						path: ':id/specialties',
						element: <CategorySpecialtiesPage />
					},
					{
						path: ':id/skills',
						element: <CategorySkillsPage />
					}
				]
			},
			{
				path: 'specialties',

				children: [
					{
						path: '',
						element: <SpecialtiesGlobal />
					},
					{
						path: ':id/skills',
						element: <SpecialtySkillsPage />
					}
				]
			},
			{
				path: 'skills',
				element: <SkillsAdminPage />
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
		<div className='min-h-dvh'>
			<QueryClientProvider client={qc}>
				<Provider store={store}>
					<PersistGate persistor={persistor}>
						<ChatSocketProvider>
							<RouterProvider router={router} />
						</ChatSocketProvider>
					</PersistGate>
					<ToastContainer />
				</Provider>
			</QueryClientProvider>
		</div>
	)
}

export default App
