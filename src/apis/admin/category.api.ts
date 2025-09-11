import type { ListResponse } from '~/types/api.response'
import type { Category } from '~/types/Category'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const baseUrl = '/category'

export const getAllCategories = async (prop: {
	page: number
	limit: number
	search: string
}): Promise<ListResponse<Category>> => {
	const params = {
		page: prop.page.toString(),
		limit: prop.limit.toString(),
		search: prop.search
	}
	const response = await authorizeAxiosInstance.get(`${baseUrl}/?${new URLSearchParams(params)}`)
	return response.data
}

export const createCategory = async (payload: Partial<Category>) => {
	const resposne = await authorizeAxiosInstance.post(`${baseUrl}/`, payload)
	return resposne.data
}

export const updateCategory = async (id: string, payload: Partial<Category>) => {
	const response = await authorizeAxiosInstance.put(`${baseUrl}/${id}`, payload)
	return response.data
}

export const deleteCategory = async (id: string) => {
	const response = await authorizeAxiosInstance.delete(`${baseUrl}/${id}`)
	return response.data
}
