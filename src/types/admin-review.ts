export type AdminReviewUser = {
	id: string
	email?: string | null
	role?: string | null
	profile?: {
		firstName?: string | null
		lastName?: string | null
		country?: string | null
		city?: string | null
	} | null
}

export type AdminReviewContract = {
	id: string
	title?: string | null
	status?: string | null
	currency?: string | null
	createdAt?: string | null
	endedAt?: string | null
	client?: {
		userId: string
		companyName?: string | null
		profile?: {
			firstName?: string | null
			lastName?: string | null
		} | null
	} | null
	freelancer?: {
		userId: string
		title?: string | null
		profile?: {
			firstName?: string | null
			lastName?: string | null
		} | null
	} | null
}

export type AdminReviewListItem = {
	id: string
	contractId: string
	reviewerId: string
	revieweeId: string
	role: 'CLIENT' | 'FREELANCER'
	rating: number
	comment?: string | null
	wouldHireAgain?: boolean | null
	createdAt: string
	updatedAt: string
	reviewer?: AdminReviewUser | null
	reviewee?: AdminReviewUser | null
	contract?: {
		id: string
		title?: string | null
		status?: string | null
	} | null
}

export type AdminReviewDetail = AdminReviewListItem & {
	contract?: AdminReviewContract | null
}

export type AdminReviewStats = {
	totalReviews: number
	clientReviews: number
	freelancerReviews: number
	averageRating: number
	ratingDistribution: {
		1: number
		2: number
		3: number
		4: number
		5: number
	}
	recentReviews: number
	positiveRate: number
}

export type AdminUserReviewSummary = {
	received: {
		reviews: AdminReviewListItem[]
		averageRating: number
		totalCount: number
	}
	given: {
		reviews: AdminReviewListItem[]
		totalCount: number
	}
}

export type AdminReviewListFilters = {
	page?: number
	limit?: number
	search?: string
	reviewerRole?: 'CLIENT' | 'FREELANCER'
	minRating?: number
	maxRating?: number
	reviewerId?: string
	revieweeId?: string
	contractId?: string
	createdFrom?: string
	createdTo?: string
	sortBy?: 'createdAt' | 'rating' | 'updatedAt'
	sortOrder?: 'asc' | 'desc'
}

export type AdminReviewListResponse = {
	data: AdminReviewListItem[]
	total: number
	page: number
	limit: number
	totalPages: number
}
