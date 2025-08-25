// Dữ liệu dạng list
export type ListResponse<T> = {
	data: T[]
	message?: string
	total?: number // nếu có phân trang
}

// Dữ liệu 1 object
export type ObjectResponse<T> = T

export type MessageResponse = {
	message: string
}
