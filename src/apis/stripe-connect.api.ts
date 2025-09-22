import authorizeAxiosInstance from '~/utils/authorizeAxios'

export interface StripeConnectAccount {
        id?: string
        accountId?: string
        stripeAccountId?: string
        detailsSubmitted?: boolean
        details_submitted?: boolean
        payoutsEnabled?: boolean
        payouts_enabled?: boolean
        chargesEnabled?: boolean
        charges_enabled?: boolean
        requirementsDue?: string[]
        requirements?: {
                currently_due?: string[]
                eventually_due?: string[]
                past_due?: string[]
        }
        [key: string]: unknown
}

export type StripeConnectAccountResponse = StripeConnectAccount & {
        account?: StripeConnectAccount | null
        connectAccount?: StripeConnectAccount | null
        stripeAccount?: StripeConnectAccount | null
        data?: StripeConnectAccount | null
        onboardingUrl?: string
        accountLinkUrl?: string
        url?: string
        loginUrl?: string
}

const baseUrl = 'stripe-connect'

export const getStripeConnectAccount = async () => {
        const response = await authorizeAxiosInstance.get<StripeConnectAccountResponse>(`${baseUrl}/account`)
        return response.data
}

export interface CreateStripeConnectAccountPayload {
        country: string
}

export const createStripeConnectAccount = async (payload?: CreateStripeConnectAccountPayload) => {
        const response = await authorizeAxiosInstance.post<StripeConnectAccountResponse>(
                `${baseUrl}/account`,
                payload
        )
        return response.data
}
