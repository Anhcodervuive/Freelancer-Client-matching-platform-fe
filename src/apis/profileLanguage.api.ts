import type { LanguageProficiency, ProfileLanguage } from '~/types/profile'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const profileLanguageBaseUrl = '/me'

export const getAllProfileLanguage = async (userId?: string): Promise<ProfileLanguage[]> => {
	const res = await authorizeAxiosInstance.get(`${profileLanguageBaseUrl}/profile/${userId}/language`)
	return res.data ?? []
}

// POST /profiles/:userId/languages { languageCode, proficiency }
export async function addProfileLanguage(params: {
	userId?: string
	languageCode: string
	proficiency: LanguageProficiency
}): Promise<ProfileLanguage> {
	const res = await authorizeAxiosInstance.put(`${profileLanguageBaseUrl}/profile/${params.userId}/language`, {
		languageCode: params.languageCode,
		proficiency: params.proficiency
	})
	return res.data
}

// DELETE /profiles/:userId/languages/:code
export async function deleteProfileLanguage(userId?: string, code?: string) {
	const res = await authorizeAxiosInstance.delete(`${profileLanguageBaseUrl}/profile/${userId}/language/${code}`)
	return res.data
}
