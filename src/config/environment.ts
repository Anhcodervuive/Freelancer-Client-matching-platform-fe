const env = {
	ROOT_URL: import.meta.env.VITE_API_ROOT_URL ?? 'http://localhost:3000/api',
	STRIPE: {
		PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? ''
	}
}

export default env
