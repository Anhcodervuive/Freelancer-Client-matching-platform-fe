export type Contract = {
	id: string
	clientId: string
	freelancer: string
	jobPostId: string | null
	proposalId: string | null
	title: string
	currency: string // "usd", ...
	createdAt: Date
	updatedAt: Date
}
