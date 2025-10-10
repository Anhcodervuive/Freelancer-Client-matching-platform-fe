export type ContractRole = 'client' | 'freelancer'

export enum ContractStatus {
	DRAFT,
	ACTIVE,
	PAUSED,
	COMPLETED,
	CANCELLED
}

export type ContractParticipantProfile = {
	firstName: string | null
	lastName: string | null
	country: string | null
	city: string | null
	avatar?: string | null
}

export type ContractClient = {
	userId: string
	profile?: ContractParticipantProfile | null
	companyName?: string | null
}

export type ContractFreelancer = {
	userId: string
	profile?: ContractParticipantProfile | null
	title?: string | null
}

export type ContractJobCategory = {
	id: string
	name: string
}

export type ContractJobSpecialty = {
	id: string
	name: string
	category?: ContractJobCategory | null
}

export type ContractJobSkill = {
	id: string
	name: string
	[key: string]: unknown
}

export type ContractJobLanguage = {
	languageCode: string
	proficiency?: string | null
	[key: string]: unknown
}

export type ContractJobAttachment = {
        id?: string
        name?: string | null
        fileName?: string | null
        url?: string | null
	fileUrl?: string | null
	size?: number | null
	mimeType?: string | null
	[key: string]: unknown
}

export type ContractMilestoneResourceAsset = {
        id?: string
        kind?: string | null
        url?: string | null
        mimeType?: string | null
        bytes?: number | null
        size?: number | null
        status?: string | null
        [key: string]: unknown
}

export type ContractMilestoneResource = {
        id?: string
        milestoneId?: string | null
        assetId?: string | null
        name?: string | null
        url?: string | null
        mimeType?: string | null
        size?: number | null
        createdAt?: string | null
        updatedAt?: string | null
        asset?: ContractMilestoneResourceAsset | null
        [key: string]: unknown
}

export type ContractJobPost = {
        id: string
        title: string
        description?: string | null
	specialty?: ContractJobSpecialty | null
	requiredSkills?: ContractJobSkill[]
	languages?: ContractJobLanguage[]
	attachments?: ContractJobAttachment[]
	budgetAmount?: number | null
	budgetCurrency?: string | null
	paymentMode?: string | null
	[key: string]: unknown
}

export type ContractProposal = {
	id: string
	submittedAt?: string | null
	bidAmount?: number | null
	bidCurrency?: string | null
	coverLetter?: string | null
	[key: string]: unknown
}

export type ContractOffer = {
	id: string
	createdAt?: string | null
	startDate?: string | null
	endDate?: string | null
	totalAmount?: number | null
	currency?: string | null
	message?: string | null
	[key: string]: unknown
}

export type Contract = {
	id: string
	code?: string | null
	title?: string | null
	status?: ContractStatus
	type?: string | null
	paymentMode?: string | null
	hourlyRate?: number | null
	hourlyRateCurrency?: string | null
	weeklyLimitHours?: number | null
	fixedPrice?: number | null
	fixedPriceCurrency?: string | null
	totalPaidAmount?: number | null
	totalPaidCurrency?: string | null
	outstandingBalance?: number | null
	outstandingCurrency?: string | null
	startDate?: string | null
	endDate?: string | null
	submittedAt?: string | null
	acceptedAt?: string | null
	createdAt?: string | null
	updatedAt?: string | null
	client: ContractClient
	freelancer: ContractFreelancer
	jobPost?: ContractJobPost | null
	proposal?: ContractProposal | null
	offer?: ContractOffer | null
	[key: string]: unknown
}

export type ContractMilestone = {
        id: string
        title: string
        description?: string | null
        amount?: number | null
        currency?: string | null
        dueDate?: string | null
        releasedAt?: string | null
        approvedAt?: string | null
        submittedAt?: string | null
        status?: string | null
        createdAt?: string | null
        updatedAt?: string | null
        resources?: ContractMilestoneResource[]
        [key: string]: unknown
}

export type CreateContractMilestoneInput = {
        title: string
        amount: number
        currency: string
}

export type ContractListFilterInput = {
        page?: number
        limit?: number
        role?: ContractRole
        search?: string
}

export type PaginatedContractResponse = {
	data: Contract[]
	total: number
	page: number
	limit: number
}
