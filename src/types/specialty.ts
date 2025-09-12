export type CategoryLite = { id: string; name: string }
export type Specialty = {
	id: string
	categoryId: string
	name: string
	slug: string
	description?: string | null
	isActive: boolean
	sortOrder: number
	createdAt: string
	updatedAt: string
	category?: CategoryLite
}
