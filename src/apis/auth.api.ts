import authorizeAxiosInstance from '~/utils/authorizeAxios'

const authBaseUrl = '/auth'

export const refreshTokenAPI = async () => {
	const response = await authorizeAxiosInstance.post(`${authBaseUrl}/refresh_token`)
	return response.data
}
