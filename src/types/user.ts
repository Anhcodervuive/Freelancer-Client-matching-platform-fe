export type User = {
	id: string
	email: string
	firstName: string | null
	lastName: string | null
	password: string
	emailVerifiedAt: Date | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
	isActive: boolean
} | null
