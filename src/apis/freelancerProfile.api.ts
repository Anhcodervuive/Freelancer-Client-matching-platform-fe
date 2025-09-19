import type { FreelancerProfile, LanguageProficiency, ProfileLanguage } from '~/types/profile'
import type { FreelancerSkillItem } from '~/types/skill'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const freelancerProfileBaseUrl = '/me'

export const getAllProfileLanguage = async (userId?: string): Promise<ProfileLanguage[]> => {
        const res = await authorizeAxiosInstance.get(`${freelancerProfileBaseUrl}/profile/${userId}/language`)
        return res.data ?? []
}

export const getFreelancerSkills = async (userId?: string): Promise<FreelancerSkillItem[]> => {
        const res = await authorizeAxiosInstance.get<FreelancerSkillItem[]>(
                `${freelancerProfileBaseUrl}/profile/${userId}/skill`
        )
        return res.data ?? []
}

// POST /profiles/:userId/languages { languageCode, proficiency }
export async function addProfileLanguage(params: {
	userId?: string
	languageCode: string
	proficiency: LanguageProficiency
}): Promise<ProfileLanguage> {
	const res = await authorizeAxiosInstance.put(`${freelancerProfileBaseUrl}/profile/${params.userId}/language`, {
		languageCode: params.languageCode,
		proficiency: params.proficiency
	})
	return res.data
}

// DELETE /profiles/:userId/languages/:code
export async function deleteProfileLanguage(userId?: string, code?: string) {
	const res = await authorizeAxiosInstance.delete(`${freelancerProfileBaseUrl}/profile/${userId}/language/${code}`)
	return res.data
}

export async function getEducationsAPI(userId?: string) {
	const { data } = await authorizeAxiosInstance.get(`${freelancerProfileBaseUrl}/profile/${userId}/education`)
	return data
}
export async function createEducationAPI(payload: unknown, userId?: string) {
	const { data } = await authorizeAxiosInstance.post(`${freelancerProfileBaseUrl}/profile/${userId}/education`, payload)
	return data
}
export async function updateEducationAPI(payload: unknown, userId?: string, edutionId?: string) {
	const { data } = await authorizeAxiosInstance.put(
		`${freelancerProfileBaseUrl}/profile/${userId}/education/${edutionId}`,
		payload
	)
	return data
}
export async function deleteEducationAPI(userId?: string, edutionId?: string) {
	const { data } = await authorizeAxiosInstance.delete(
		`${freelancerProfileBaseUrl}/profile/${userId}/education/${edutionId}`
	)
	return data
}

export async function getFreelancerProfileAPI(userId?: string) {
	const response = await authorizeAxiosInstance.get(`${freelancerProfileBaseUrl}/profile/${userId}/freelancer`)
	return response.data
}

export async function updateFreelancerProfileAPI(payload: Partial<Omit<FreelancerProfile, 'userId'>>, userId?: string) {
	const { data } = await authorizeAxiosInstance.put<FreelancerProfile>(
		`${freelancerProfileBaseUrl}/profile/${userId}/freelancer`,
		payload
	)
	return data
}

export async function setFreelancerCategoryAndSpecialty(payload: { categoryIds: string[]; specialtyIds: string[] }) {
	const response = await authorizeAxiosInstance.post('/onboarding/cat-spe', {
		categoryIds: payload.categoryIds,
		specialtyIds: payload.specialtyIds
	})
	return response.data
}

export async function setFreelancerSkills(payload: { skillIds: string[] }) {
	const response = await authorizeAxiosInstance.post('/onboarding/skill', payload)
	return response.data
}
