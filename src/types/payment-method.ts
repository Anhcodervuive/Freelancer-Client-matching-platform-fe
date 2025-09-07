export type PaymentMethod = {
	id: string
	profileId: string
	stripeCustomerId: string
	paymentMethodId: string // pm_xxx
	firstName: string
	lastName: string
	brand?: string | null
	last4?: string | null
	expMonth?: number | null
	expYear?: number | null
	isDefault: boolean
	// optional billing fields if bạn lưu:
	billingCountry?: string | null
	billingCity?: string | null
	billingLine1?: string | null
	billingLine2?: string | null
	billingPostal?: string | null
	createdAt: string
}
