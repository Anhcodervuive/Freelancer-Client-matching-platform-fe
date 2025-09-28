const apiRootUrl = import.meta.env.VITE_API_ROOT_URL ?? 'http://localhost:3000/api'

const inferSocketUrl = () => {
        try {
                const url = new URL(apiRootUrl)
                return `${url.protocol}//${url.host}`
        } catch {
                return 'http://localhost:3000'
        }
}

const env = {
        ROOT_URL: apiRootUrl,
        SOCKET_URL: import.meta.env.VITE_SOCKET_ROOT_URL ?? inferSocketUrl(),
        STRIPE: {
                PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? ''
        }
}

export default env
