export type OwnerType = 'category' | 'specialty'

export interface SkillLite {
	id: string
	slug: string
	name: string
	description?: string | null
	isActive: boolean
}

export interface OwnerSkillItem {
	// bên BE trả categoryId hoặc specialtyId; client không cần dùng trực tiếp
	skillId: string
	weight: number
	isDeleted: boolean
	deletedAt?: string | null
	deletedBy?: string | null
	skill: SkillLite
}
