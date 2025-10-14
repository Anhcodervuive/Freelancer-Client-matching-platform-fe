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
        externalAccountSummary?: unknown
        external_account_summary?: unknown
        [key: string]: unknown
}

export interface StripeConnectAccountNextAction {
        url?: string
        reason?: string
        type?: string
        linkType?: string
}

export interface StripeConnectAccountStatusResponse {
        connectAccount?: StripeConnectAccount | null
        needsUpdate?: boolean
        nextAction?: StripeConnectAccountNextAction | null
}

export type StripeConnectAccountResponse = StripeConnectAccountStatusResponse &
        StripeConnectAccount & {
                account?: StripeConnectAccount | null
                stripeAccount?: StripeConnectAccount | null
                data?: StripeConnectAccount | null
                onboardingUrl?: string
                accountLinkUrl?: string
                url?: string
                loginUrl?: string
        }

const baseUrl = '/freelancer/connect-account'

export interface StripeConnectAccountStatusParams {
        returnUrl?: string
        refreshUrl?: string
}

export const getStripeConnectAccountStatus = async (
        params?: StripeConnectAccountStatusParams
) => {
        const queryParams: Record<string, string> = {}

        if (params?.returnUrl) {
                queryParams.returnUrl = params.returnUrl
        }

        if (params?.refreshUrl) {
                queryParams.refreshUrl = params.refreshUrl
        }

        const response = await authorizeAxiosInstance.get<StripeConnectAccountStatusResponse>(
                `${baseUrl}/status`,
                Object.keys(queryParams).length > 0 ? { params: queryParams } : undefined
        )
        return response.data
}

export const getStripeConnectAccount = (params?: StripeConnectAccountStatusParams) =>
        getStripeConnectAccountStatus(params)

export interface CreateStripeConnectAccountPayload {
	country: string
}

export const createStripeConnectAccount = async (payload?: CreateStripeConnectAccountPayload) => {
        const response = await authorizeAxiosInstance.post<StripeConnectAccountResponse>(`${baseUrl}/link`, {
                ...payload,
                mode: 'onboarding'
        })
        return response.data
}

export const deleteStripeConnectAccount = async () => {
        const response = await authorizeAxiosInstance.delete(`${baseUrl}/`)
        return response.data
}
