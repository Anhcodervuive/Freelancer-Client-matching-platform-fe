import { createBrowserRouter, RouterProvider } from "react-router-dom"
import HomePage from "~/pages/Comons/HomePage"
import AuthPage from "./pages/Auth"


function App() {

  const router = createBrowserRouter([
    {
      path: '/',
      element: <HomePage />
    },
    {
      path: '/signup',
      element: <AuthPage />
    },
    {
      path: '/signin',
      element: <AuthPage />
    }
  ])
  return <RouterProvider router={router} />
}

export default App
