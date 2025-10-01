export enum Role {
	FREELANCER = 'FREELANCER',
	CLIENT = 'CLIENT',
	ADMIN = 'ADMIN'
}

export type profile = {
	userId: string
	address?: string
	country?: string
	createdAt?: Date
	district?: string
	firstName?: string
	lastName?: string
	phoneNumber?: string
	stripeCustomerId?: string
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

	// Trờng này dự phòng nhầm 1 số trường hợp user trả thông tin trong profile
	profile: profile
} | null
