export enum Role {
	FREELANCER = 'FREELANCER',
	CLIENT = 'CLIENT',
	ADMIN = 'ADMIN'
}

export type User = {
	id: string
	email: string
	firstName?: string
	lastName?: string
	phoneNumber?: string
	avatar?: string
	country?: string
	city?: string
	district?: string
	address?: string
	role?: Role
	createdAt?: Date
	updatedAt?: Date
	deletedAt?: Date
	isActive?: boolean
} | null
