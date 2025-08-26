import authorizeAxiosInstance from '~/utils/authorizeAxios'

const authBaseUrl = '/auth'

export const signupUserAPI = async (data: unknown) => {
	const response = await authorizeAxiosInstance.post(`${authBaseUrl}/signup`, data)
	return response.data
}

export const verifyUserAPI = async (token: string) => {
	const response = await authorizeAxiosInstance.put(`${authBaseUrl}/verify/${token}`)
	return response.data
}

export const resendVerifyEmailAPI = async (email: string) => {
	const response = await authorizeAxiosInstance.post(`${authBaseUrl}/resend-verify-email/${email}`)
	return response.data
}

export const refreshTokenAPI = async () => {
	const response = await authorizeAxiosInstance.post(`${authBaseUrl}/refresh_token`)
	return response.data
}
