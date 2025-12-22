export type AdminContractClient = {
	userId: string
	companyName?: string | null
	profile?: {
		firstName?: string | null
		lastName?: string | null
		country?: string | null
		city?: string | null
		avatar?: string | null
	} | null
}

export type AdminContractFreelancer = {
	userId: string
	title?: string | null
	profile?: {
		firstName?: string | null
		lastName?: string | null
		country?: string | null
		city?: string | null
		avatar?: string | null
	} | null
}

export type AdminContractJob = {
	id: string
	title?: string | null
	status?: string | null
	paymentMode?: string | null
	budgetAmount?: number | null
	budgetCurrency?: string | null
}

export type AdminContractEscrow = {
	id: string
	status?: string | null
	amountFunded?: number | null
	amountReleased?: number | null
	amountRefunded?: number | null
	currency?: string | null
}

export type AdminContractMilestone = {
	id: string
	title: string
	amount?: number | null
	currency?: string | null
	status?: string | null
	startAt?: string | null
	endAt?: string | null
	createdAt?: string | null
	updatedAt?: string | null
	escrow?: AdminContractEscrow | null
}

export type AdminContractFeedback = {
	id: string
	rating?: number | null
	comment?: string | null
	role?: string | null
	createdAt?: string | null
	reviewer?: {
		id: string
		profile?: {
			firstName?: string | null
			lastName?: string | null
			avatar?: string | null
		} | null
	} | null
}

export type AdminContractListItem = {
	id: string
	code?: string | null
	title?: string | null
	status?: string | null
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
	createdAt?: string | null
	updatedAt?: string | null
	closedAt?: string | null
	closureType?: string | null
	closureReason?: string | null
	clientId?: string | null
	freelancerId?: string | null
	client?: AdminContractClient | null
	freelancer?: AdminContractFreelancer | null
	jobPost?: AdminContractJob | null
	_count?: {
		milestones?: number
	}
}

export type AdminContractMilestoneStats = {
	total: number
	released: number
	approved: number
	submitted: number
	open: number
	canceled: number
	disputed: number
}

export type AdminContractFinancialStats = {
	totalFunded: number
	totalReleased: number
	totalRefunded: number
	currency: string
}

export type AdminContractDetail = AdminContractListItem & {
	milestones?: AdminContractMilestone[]
	feedbacks?: AdminContractFeedback[]
	milestoneStats?: AdminContractMilestoneStats
	financialStats?: AdminContractFinancialStats
}

export type AdminContractStats = {
	totalContracts: number
	activeContracts: number
	completedContracts: number
	cancelledContracts: number
	draftContracts: number
	pausedContracts: number
	totalValue: number
}

export type AdminContractListFilters = {
	page?: number
	limit?: number
	search?: string
	status?: string
	clientId?: string
	freelancerId?: string
	createdFrom?: string
	createdTo?: string
	sortBy?: 'createdAt' | 'updatedAt' | 'totalPaidAmount' | 'title'
	sortOrder?: 'asc' | 'desc'
}

export type AdminContractListResponse = {
	data: AdminContractListItem[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export enum AdminContractStatus {
	DRAFT = 'DRAFT',
	ACTIVE = 'ACTIVE',
	PAUSED = 'PAUSED',
	COMPLETED = 'COMPLETED',
	CANCELLED = 'CANCELLED'
}
