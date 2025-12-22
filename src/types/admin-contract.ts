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

// ============================================================================
// PAYMENT DETAILS TYPES
// ============================================================================

export type AdminPaymentTransaction = {
	id: string
	type: 'PAYMENT' | 'TRANSFER' | 'REFUND'
	amount: number
	currency: string
	status: string
	description: string
	milestoneTitle: string
	cardInfo?: string
	createdAt: string
}

export type AdminMilestonePayment = {
	milestoneId: string
	milestoneTitle: string
	milestoneStatus: string
	amount: number
	currency: string
	escrowStatus: string
	funded: number
	released: number
	refunded: number
	platformFee: number
	processingFee: number
	netToFreelancer: number
	approvedAt?: string | null
	releasedAt?: string | null
	payments: Array<{
		id: string
		amount: number
		currency: string
		status: string
		type: string
		cardBrand?: string | null
		cardLast4?: string | null
		createdAt: string
	}>
	transfers: Array<{
		id: string
		amount: number
		currency: string
		status: string
		createdAt: string
	}>
	refunds: Array<{
		id: string
		amount: number
		currency: string
		status: string
		createdAt: string
	}>
}

export type AdminPaymentOverview = {
	totalContractValue: number
	totalFunded: number
	totalReleased: number
	totalRefunded: number
	outstandingBalance: number
	inEscrow: number
	totalPlatformFee: number
	totalProcessingFee: number
	netToFreelancer: number
	currency: string
}

export type AdminContractPaymentDetails = {
	contract: {
		id: string
		title: string
		status: string
		currency: string
		createdAt: string
		client: {
			userId: string
			companyName?: string | null
			profile?: {
				firstName?: string | null
				lastName?: string | null
			} | null
		}
		freelancer: {
			userId: string
			title?: string | null
			profile?: {
				firstName?: string | null
				lastName?: string | null
			} | null
			payoutsEnabled: boolean
		}
	}
	paymentOverview: AdminPaymentOverview
	milestonePayments: AdminMilestonePayment[]
	transactions: AdminPaymentTransaction[]
	summary: {
		totalMilestones: number
		fundedMilestones: number
		releasedMilestones: number
		pendingMilestones: number
	}
}
