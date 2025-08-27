export type User = {
	id: string
	email: string
	firstName?: string
	lastName?: string
	displayName?: string
	avatar?: string
	role?: string
	createdAt?: Date
	updatedAt?: Date
	deletedAt?: Date
	isActive?: boolean
} | null
