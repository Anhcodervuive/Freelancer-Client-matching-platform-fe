import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import HomePage from '~/pages/Comons/HomePage'
import AuthPage from './pages/Auth'
import { ToastContainer } from 'react-toastify'

const router = createBrowserRouter([
	{
		path: '/',
		element: <HomePage />,
	},
	{
		path: '/signup',
		element: <AuthPage />,
	},
	{
		path: '/signin',
		element: <AuthPage />,
	},
])

function App() {
	return (
		<div className='font-display'>
			<RouterProvider router={router} />
			<ToastContainer />
		</div>
	)
}

export default App
