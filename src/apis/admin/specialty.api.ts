import type { ListResponse } from '~/types/api.response'
import type { Specialty } from '~/types/specialty'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const baseUrl = 'specialty'

export async function getSpecialties(_props: {
	page: number
	limit: number
	search: string
	categoryId?: string
}): Promise<ListResponse<Specialty>>
export async function getSpecialties(_props: {
	page: number
	limit: number
	search: string
	categoryId?: string[]
}): Promise<ListResponse<Specialty>>

export async function getSpecialties(props: {
	page: number
	limit: number
	search: string
	categoryId?: string | string[]
}): Promise<ListResponse<Specialty>> {
	const params: Record<string, string> = {
		page: props.page.toString(),
		limit: props.limit.toString(),
		search: props.search
	}
	let response
	if (Array.isArray(props.categoryId)) {
		params.categoryIds = props.categoryId.join(',')
		response = await authorizeAxiosInstance.get(`${baseUrl}/categories/?${new URLSearchParams(params)}`)
	} else {
		params.categoryId = props.categoryId ?? ''
		response = await authorizeAxiosInstance.get(`${baseUrl}/?${new URLSearchParams(params)}`)
	}

	return response.data
}

export const createSpecialty = async (payload: Partial<Specialty>) => {
	const resposne = await authorizeAxiosInstance.post(`${baseUrl}/`, payload)
	return resposne.data
}

export const updateSpecialty = async (id: string, payload: Partial<Specialty>) => {
	const response = await authorizeAxiosInstance.patch(`${baseUrl}/${id}`, payload)
	return response.data
}

export const deleteSpecialty = async (id: string) => {
	const response = await authorizeAxiosInstance.delete(`${baseUrl}/${id}`)
	return response.data
}

export async function getSpecialtiesByCategory(props: {
	page: number
	limit: number
	search: string
	categoryId: string
}): Promise<ListResponse<Specialty>> {
	const params = {
		page: props.page.toString(),
		limit: props.limit.toString(),
		search: props.search
	}
        const response = await authorizeAxiosInstance.get(
                `category/${props.categoryId}/specialty?${new URLSearchParams(params)}`
        )
	return response.data
}
