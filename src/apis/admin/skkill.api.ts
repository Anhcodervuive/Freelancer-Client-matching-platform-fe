import type { ListResponse } from '~/types/api.response'
import type { OwnerSkillItem, OwnerType, SkillLite } from '~/types/skill'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const base = (ownerType: OwnerType) => (ownerType === 'category' ? '/category' : '/specialty')

export async function getOwnerSkills(
	ownerType: OwnerType,
	ownerId: string,
	params: { search?: string; status?: 'deleted' | 'all'; page?: number; limit?: number }
): Promise<ListResponse<OwnerSkillItem>> {
	const res = await authorizeAxiosInstance.get(`${base(ownerType)}/${ownerId}/skill`, { params })
	return res.data
}

export async function patchOwnerSkill(
	ownerType: OwnerType,
	ownerId: string,
	skillId: string,
	body: { weight?: number; isDeleted?: boolean }
) {
	const res = await authorizeAxiosInstance.patch(`${base(ownerType)}/${ownerId}/skill/${skillId}`, body)
	return res.data?.data as OwnerSkillItem
}

export async function deleteOwnerSkill(ownerType: OwnerType, ownerId: string, skillId: string) {
	const res = await authorizeAxiosInstance.delete(`${base(ownerType)}/${ownerId}/skill/${skillId}`)
	return res.data?.data as OwnerSkillItem
}

export async function restoreOwnerSkill(ownerType: OwnerType, ownerId: string, skillId: string) {
	const res = await authorizeAxiosInstance.post(`${base(ownerType)}/${ownerId}/skill/${skillId}/restore`)
	return res.data?.data as OwnerSkillItem
}

export async function attacByIds(
	ownerType: OwnerType,
	ownerId: string,
	body: { skillIds: string[]; defaultWeight?: number }
) {
	const res = await authorizeAxiosInstance.post(`${base(ownerType)}/${ownerId}/attach`, body)
	return res.data?.data as OwnerSkillItem[]
}

export async function attachSkillsBulk(
	ownerType: OwnerType,
	ownerId: string,
	body: { items: Array<{ skillId: string; weight?: number }>; defaultWeight?: number }
) {
	const res = await authorizeAxiosInstance.post(`${base(ownerType)}/${ownerId}/skill/bulk`, body)
	return res.data?.data as OwnerSkillItem[]
}

export async function searchSkills(params: {
	search?: string
	page?: number
	limit?: number
	onlyActive?: boolean
	categoryIds?: string
	specialtyIds?: string
}) {
	const res = await authorizeAxiosInstance.get(`/skill`, { params })
	return res.data as ListResponse<SkillLite>
}

export const createSkill = async (data: Partial<SkillLite>) => {
	const resposne = await authorizeAxiosInstance.post('skill', data)
	return resposne.data
}

export const updateSkill = async (id: string, patch: Partial<SkillLite>) => {
	const response = await authorizeAxiosInstance.put(`skill/${id}`, patch)
	return response.data
}

export const deleteSkill = async (id: string) => {
	const response = await authorizeAxiosInstance.delete(`skill/${id}`)
	return response.data
}
