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
	displayName?: string
	avatar?: string
	role?: Role
	createdAt?: Date
	updatedAt?: Date
	deletedAt?: Date
	isActive?: boolean
} | null
