import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ExternalLink, Info, OctagonAlert, RefreshCcw, Sparkles } from 'lucide-react'
import { toast } from 'react-toastify'
import {
        createStripeConnectAccount,
        deleteStripeConnectAccount,
        getStripeConnectAccountStatus,
        type CreateStripeConnectAccountPayload,
        type StripeConnectAccount,
        type StripeConnectAccountNextAction,
        type StripeConnectAccountResponse,
        type StripeConnectAccountStatusParams,
        type StripeConnectAccountStatusResponse
} from '~/apis/stripe-connect.api'
import CountrySelect, { type CountryOption } from '~/components/form/CountryAutocomplete'
import { routes } from '~/config/routes'
import {
        getCountryOptionByCode,
        stripeSupportedCountryOptions
} from '~/constants/stripeCountries'

type Tone = 'success' | 'warning' | 'info' | 'danger'

const toneBadgeClass: Record<Tone, string> = {
success: 'bg-emerald-500/15 text-emerald-600',
warning: 'bg-amber-500/15 text-amber-600',
info: 'bg-sky-500/15 text-sky-600',
danger: 'bg-rose-500/15 text-rose-600'
}

const toneBannerClass: Record<Tone, string> = {
success: 'border-emerald-200/70 bg-emerald-50/80',
warning: 'border-amber-200/70 bg-amber-50/80',
info: 'border-sky-200/70 bg-sky-50/80',
danger: 'border-rose-200/70 bg-rose-50/80'
}

const toneTitleClass: Record<Tone, string> = {
success: 'text-emerald-700',
warning: 'text-amber-700',
info: 'text-sky-700',
danger: 'text-rose-700'
}

const toneIcon: Record<Tone, ReactNode> = {
        success: <CheckCircle2 className='h-4 w-4' />,
        warning: <AlertTriangle className='h-4 w-4' />,
        info: <Info className='h-4 w-4' />,
        danger: <OctagonAlert className='h-4 w-4' />
}

type ExternalAccountSummary = {
        bankName?: string
        last4?: string
        currency?: string
        accountHolderName?: string
        routingNumber?: string
}

const parseExternalAccountSummary = (value?: unknown): ExternalAccountSummary | null => {
        if (!value) return null

        if (typeof value === 'string') {
                try {
                        const parsed = JSON.parse(value)
                        return parseExternalAccountSummary(parsed)
                } catch {
                        return null
                }
        }

        if (Array.isArray(value)) {
                for (const item of value) {
                        const parsed = parseExternalAccountSummary(item)
                        if (parsed) return parsed
                }
                return null
        }

        if (typeof value === 'object') {
                const record = value as Record<string, unknown>
                const summary: ExternalAccountSummary = {
                        bankName: pickString(record.bank_name, record.bankName, record.bank),
                        last4: pickString(record.last4),
                        currency: pickString(record.currency),
                        accountHolderName: pickString(record.account_holder_name, record.accountHolderName),
                        routingNumber: pickString(record.routing_number, record.routingNumber)
                }

                if (Object.values(summary).some(Boolean)) {
                        return summary
                }

                const nestedCandidates = [
                        record.summary,
                        record.data,
                        record.external_account,
                        record.externalAccount
                ]

                for (const candidate of nestedCandidates) {
                        const parsed = parseExternalAccountSummary(candidate)
                        if (parsed) return parsed
                }
        }

        return null
}

const detailList = (items: string[]) => {
        if (!items.length) return null
        return (
                <ul className='mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-500'>
                        {items.map(item => (
                                <li key={item}>{item}</li>
                        ))}
                </ul>
        )
}

const collectBankDetails = (summary?: ExternalAccountSummary | null) => {
        const details: string[] = []

        if (!summary) return details

        if (summary.bankName) {
                details.push(`Bank: ${summary.bankName}`)
        }

        if (summary.last4) {
                details.push(`Account ending in •••• ${summary.last4}`)
        }

        if (summary.currency) {
                details.push(`Currency: ${summary.currency.toUpperCase()}`)
        }

        if (summary.accountHolderName) {
                details.push(`Account holder: ${summary.accountHolderName}`)
        }

        if (summary.routingNumber) {
                details.push(`Routing number: ${summary.routingNumber}`)
        }

        return details
}

const formatStripeLabel = (value?: string | null) => {
        if (!value || typeof value !== 'string') return null

        const cleaned = value.trim()
        if (!cleaned) return null

        return cleaned
                .split(/[_-]/g)
                .filter(Boolean)
                .map((segment, index) => {
                        const lower = segment.toLowerCase()
                        return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower
                })
                .join(' ')
}

function extractAccount(
        payload?: StripeConnectAccountStatusResponse | StripeConnectAccountResponse | null
): StripeConnectAccount | null {
        if (!payload) return null

        const candidates = [payload.account, payload.connectAccount, payload.stripeAccount, payload.data]
        for (const candidate of candidates) {
                if (candidate && typeof candidate === 'object') {
                        return candidate as StripeConnectAccount
                }
        }

        return payload
}

function pickString(...values: Array<unknown>): string | undefined {
        return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}

function pickBoolean(...values: Array<unknown>): boolean {
        const value = values.find((item): item is boolean => typeof item === 'boolean')
        return Boolean(value)
}

function pickStringArray(value?: unknown): string[] {
        if (!value) return []
        if (Array.isArray(value)) {
                return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
        }
        return []
}

const requirementsFromAccount = (account: StripeConnectAccount | null): string[] => {
        if (!account) return []
        const possible = [
                account.requirementsDue,
                account.requirements?.currently_due,
                account.requirements?.eventually_due,
                account.requirements?.past_due
        ]

        for (const value of possible) {
                const list = pickStringArray(value)
                if (list.length > 0) return list
        }

        return []
}

const statusDescription = (params: {
        hasAccount: boolean
        detailsSubmitted: boolean
        payoutsEnabled: boolean
        requirements: string[]
        needsUpdate?: boolean
}) => {
        const { hasAccount, detailsSubmitted, payoutsEnabled, requirements, needsUpdate } = params

        if (needsUpdate) {
                return {
                        tone: 'warning' as Tone,
                        title: 'Stripe needs more information',
                        description: 'Open the Stripe flow to finish onboarding or update your details.'
                }
        }

        if (!hasAccount) {
                return {
                        tone: 'warning' as Tone,
                        title: 'Stripe not connected',
                        description: 'Create a Stripe Connect account to receive payments.'
                }
        }

        if (!detailsSubmitted) {
                return {
                        tone: 'warning' as Tone,
                        title: 'Verification incomplete',
                        description: 'Finish the remaining onboarding steps in Stripe.'
                }
        }

        if (requirements.length > 0) {
                return {
                        tone: 'danger' as Tone,
                        title: 'Additional information required',
                        description: 'Provide the missing details before Stripe enables payouts.'
                }
        }

        if (!payoutsEnabled) {
                return {
                        tone: 'info' as Tone,
                        title: 'Stripe review in progress',
                        description: 'Stripe will enable payouts once their review is complete.'
                }
        }

        return {
                tone: 'success' as Tone,
                title: 'Stripe Connect is ready',
                description: 'You can receive payouts as normal.'
        }
}

const StatusBanner = ({
	tone,
	title,
	description
}: {
	tone: Tone
	title: string
	description: string
}) => {
	return (
		<div className={`rounded-3xl border p-5 shadow-sm ${toneBannerClass[tone]}`}>
			<div className='flex items-start gap-4'>
				<span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${toneBadgeClass[tone]}`}>
					{toneIcon[tone]}
				</span>
				<div className='space-y-1 text-sm'>
					<p className={`font-semibold ${toneTitleClass[tone]}`}>{title}</p>
					<p className='leading-relaxed text-slate-600'>{description}</p>
				</div>
			</div>
		</div>
	)
}

const StatusTile = ({
	tone,
	title,
	description,
	children
}: {
	tone: Tone
	title: string
	description: string
	children?: ReactNode
}) => {
	return (
		<div className='flex h-full items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-sm transition hover:shadow-md/40'>
			<span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${toneBadgeClass[tone]}`}>
				{toneIcon[tone]}
			</span>
			<div className='space-y-1.5'>
				<p className='text-sm font-semibold text-slate-900'>{title}</p>
				<p className='text-xs leading-relaxed text-slate-500'>{description}</p>
				{children}
			</div>
		</div>
	)
}

const requirementList = (requirements: string[]) => {
        if (!requirements.length) return null
        return (
                <ul className='mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-500'>
                        {requirements.map(item => (
                                <li key={item}>{item.replace(/_/g, ' ')}</li>
                        ))}
                </ul>
        )
}

const summarySections = (
        accountId?: string,
        detailsSubmitted?: boolean,
        payoutsEnabled?: boolean,
        requirements: string[] = [],
        countryName?: string,
        needsUpdate?: boolean,
        nextAction?: StripeConnectAccountNextAction | null
) => {
        const sections: Array<{
                key: string
                tone: Tone
                title: string
                description: string
                extra?: ReactNode
        }> = []

        sections.push({
                key: 'country',
                tone: countryName ? 'success' : 'warning',
                title: 'Stripe Connect country',
                description: countryName
                        ? `Stripe is configuring your account in ${countryName}.`
                        : 'Select a country to begin the Stripe Connect process.'
        })

        if (typeof needsUpdate === 'boolean') {
                const actionLabel = formatStripeLabel(nextAction?.linkType) ?? 'Stripe review'
                const reasonLabel = formatStripeLabel(nextAction?.reason)

                sections.push({
                        key: 'next-action',
                        tone: needsUpdate ? 'warning' : 'success',
                        title: 'Stripe action required',
                        description: needsUpdate
                                ? 'Stripe asked you to reopen the onboarding flow or update your information.'
                                : 'Stripe has no outstanding tasks for your account.',
                        extra:
                                needsUpdate && (actionLabel || reasonLabel)
                                        ? (
                                                  <p className='text-xs leading-relaxed text-slate-500'>
                                                          {`Next step: ${actionLabel ?? reasonLabel}.`}
                                                  </p>
                                          )
                                        : undefined
                })
        }

        sections.push({
                key: 'account',
                tone: accountId ? 'success' : 'warning',
                title: 'Stripe Connect account',
                description: accountId
                        ? `Account created with ID ${accountId}.`
                        : 'You have not created a Stripe Connect account for your freelancer profile yet.'
        })

        sections.push({
                key: 'details',
                tone: detailsSubmitted ? 'success' : 'warning',
                title: 'Verification profile',
                description: detailsSubmitted
                        ? 'You submitted the required verification details to Stripe.'
                        : 'Stripe still needs you to complete the identity verification form.'
        })

        sections.push({
                key: 'payouts',
                tone: payoutsEnabled ? 'success' : requirements.length > 0 ? 'danger' : 'info',
                title: 'Payout status',
                description: payoutsEnabled
                        ? 'Payouts are enabled—you can receive funds from the platform.'
                        : requirements.length > 0
                                ? 'Stripe is blocking payouts until you provide the missing information.'
                                : 'Stripe will enable payouts once their review is complete.'
        })

        if (requirements.length > 0) {
                sections.push({
                        key: 'requirements',
                        tone: 'danger',
                        title: 'Information to provide',
                        description: 'Stripe still needs the following items:',
                        extra: requirementList(requirements)
                })
        }

        return sections
}

const renderSummary = (sections: ReturnType<typeof summarySections>) => {
        const flaggedSections = sections.filter(section => section.tone !== 'success')

        if (flaggedSections.length === 0) {
                return (
                                <div className='flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4 text-xs font-medium text-emerald-700'>
                                        <CheckCircle2 className='h-4 w-4' />
                                        Your Stripe Connect account is fully set up—no alerts to show.
                                </div>
                )
        }

        return (
                <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                        {flaggedSections.map(section => (
                                <div key={section.key} className='h-full'>
                                        <StatusTile tone={section.tone} title={section.title} description={section.description}>
                                                {section.extra}
                                        </StatusTile>
                                </div>
                        ))}
                </div>
        )
}

const GetPaidPage = () => {
        const location = useLocation()

        const statusParams = useMemo<StripeConnectAccountStatusParams>(() => {
                if (typeof window === 'undefined') return {}

                try {
                        const url = new URL(location.pathname + location.search, window.location.origin)
                        const absolute = url.toString()
                        return { returnUrl: absolute, refreshUrl: absolute }
                } catch {
                        try {
                                const fallback = new URL(window.location.href).toString()
                                return { returnUrl: fallback, refreshUrl: fallback }
                        } catch {
                                return {}
                        }
                }
        }, [location.pathname, location.search])

        const { data, isLoading, isFetching, refetch } = useQuery({
                queryKey: ['stripe-connect-account-status', statusParams.returnUrl, statusParams.refreshUrl],
                queryFn: () => getStripeConnectAccountStatus(statusParams)
        })

        const needsUpdate = Boolean(data?.needsUpdate)
        const nextAction = (data?.nextAction ?? null) as StripeConnectAccountNextAction | null
        const nextActionUrl = useMemo(() => pickString(nextAction?.url), [nextAction])
        const nextActionLinkTypeLabel = useMemo(() => formatStripeLabel(nextAction?.linkType), [nextAction])
        const nextActionReasonLabel = useMemo(() => formatStripeLabel(nextAction?.reason), [nextAction])
        const missingReturnUrl = nextAction?.reason === 'MISSING_RETURN_URL'
        const normalizedLinkType = useMemo(() => {
                if (!nextAction?.linkType) return ''
                return String(nextAction.linkType).toLowerCase()
        }, [nextAction])
        const nextActionBanner = useMemo(() => {
                if (!needsUpdate) return null

                if (missingReturnUrl) {
                        return {
                                tone: 'danger' as Tone,
                                title: 'Stripe link configuration required',
                                description:
                                        'Stripe could not generate the onboarding link because the return and refresh URLs are missing. Configure absolute HTTPS URLs and refresh this page to try again.'
                        }
                }

                const descriptionParts: string[] = []

                if (nextActionReasonLabel) {
                        descriptionParts.push(`Reason from Stripe: ${nextActionReasonLabel}.`)
                }

                if (nextActionUrl) {
                        descriptionParts.push('Use the button below to open Stripe and finish the pending task.')
                } else {
                        descriptionParts.push('Refresh the status or contact support if the link is still missing.')
                }

                return {
                        tone: 'warning' as Tone,
                        title: nextActionLinkTypeLabel ?? 'Stripe needs more information',
                        description: descriptionParts.join(' ')
                }
        }, [needsUpdate, missingReturnUrl, nextActionLinkTypeLabel, nextActionReasonLabel, nextActionUrl])

        const createAccountMutation = useMutation({
                mutationFn: (payload?: CreateStripeConnectAccountPayload) =>
                        createStripeConnectAccount(payload),
                onSuccess: res => {
                        const urlCandidate = pickString(
                                res?.nextAction?.url,
                                res?.onboardingUrl,
                                res?.accountLinkUrl,
                                res?.url,
                                res?.loginUrl
                        )

                        if (urlCandidate) {
                                window.open(urlCandidate, '_blank', 'noopener')
                        }

                        toast.success('Stripe Connect link created successfully!')
                        refetch()
                },
                onError: () => {
                        toast.error('Unable to open Stripe Connect. Please try again later.')
                }
        })

        const deleteAccountMutation = useMutation({
                mutationFn: () => deleteStripeConnectAccount(),
                onSuccess: () => {
                        toast.success('Stripe Connect account deleted successfully.')
                        setAcknowledgeDelete(false)
                        setAcknowledgeCreate(false)
                        setCountryOption(null)
                        refetch()
                },
                onError: () => {
                        toast.error(
                                'Unable to delete the Stripe Connect account. Please review the policy and try again.'
                        )
                }
        })

        const account = useMemo(() => extractAccount(data), [data])
        const accountId = useMemo(
                () => pickString(account?.accountId, account?.stripeAccountId, account?.id),
                [account]
        )
        const accountCountry = useMemo(() => pickString(account?.country), [account])
        const accountCountryOption = useMemo<CountryOption | null>(() => {
                if (!accountCountry) return null
                const match = stripeSupportedCountryOptions.find(item => item.value === accountCountry)
                if (match) return match
                return getCountryOptionByCode(accountCountry)
        }, [accountCountry])
        const [countryOption, setCountryOption] = useState<CountryOption | null>(() => accountCountryOption)

        useEffect(() => {
                if (accountCountryOption) {
                        setCountryOption(accountCountryOption)
                }
        }, [accountCountryOption])

        const [acknowledgeCreate, setAcknowledgeCreate] = useState(false)
        const [acknowledgeDelete, setAcknowledgeDelete] = useState(false)

        useEffect(() => {
                if (!accountId) {
                        setAcknowledgeCreate(false)
                }
        }, [accountId])

        useEffect(() => {
                setAcknowledgeDelete(false)
        }, [accountId])

        const detailsSubmitted = useMemo(
                () => pickBoolean(account?.detailsSubmitted, account?.details_submitted),
                [account]
        )
        const payoutsEnabled = useMemo(
                () => pickBoolean(account?.payoutsEnabled, account?.payouts_enabled),
                [account]
        )
        const requirements = useMemo(() => requirementsFromAccount(account), [account])

        const externalAccountSummary = useMemo(() => {
                if (!account) return null
                const record = account as Record<string, unknown>
                const candidates = [
                        record['externalAccountSummary'],
                        record['external_account_summary'],
                        record['externalAccounts'],
                        record['external_accounts'],
                        record['bankAccount'],
                        record['bank_account'],
                        record['default_external_account'],
                        record['defaultExternalAccount']
                ]

                for (const candidate of candidates) {
                        const parsed = parseExternalAccountSummary(candidate)
                        if (parsed) return parsed
                }

                return parseExternalAccountSummary(record)
        }, [account])

        const overview = useMemo(
                () =>
                        statusDescription({
                                hasAccount: Boolean(accountId),
                                detailsSubmitted,
                                payoutsEnabled,
                                requirements,
                                needsUpdate
                        }),
                [accountId, detailsSubmitted, payoutsEnabled, requirements, needsUpdate]
        )

        const sections = useMemo(
                () =>
                        summarySections(
                                accountId,
                                detailsSubmitted,
                                payoutsEnabled,
                                requirements,
                                accountCountryOption?.label,
                                needsUpdate,
                                nextAction
                        ),
                [
                        accountId,
                        detailsSubmitted,
                        payoutsEnabled,
                        requirements,
                        accountCountryOption,
                        needsUpdate,
                        nextAction
                ]
        )

        const bankDetails = useMemo(() => collectBankDetails(externalAccountSummary), [externalAccountSummary])
        const hasBankSummary = bankDetails.length > 0
        const showBankCard = Boolean(accountId || hasBankSummary)
        const bankTone: Tone = hasBankSummary ? 'success' : accountId ? 'warning' : 'info'
        const bankDescription = hasBankSummary
                ? 'Stripe has linked a bank account to send payouts.'
                : 'Stripe has not registered a bank account for payouts yet.'

        const loading = isLoading || isFetching
        const isDeleting = deleteAccountMutation.isPending
        const countryLocked = Boolean(accountId)

        const callToActionLabel = useMemo(() => {
                if (needsUpdate) {
                        if (normalizedLinkType.includes('update')) return 'Update Stripe information'
                        if (normalizedLinkType.includes('onboarding')) return 'Resume Stripe onboarding'
                        if (normalizedLinkType.includes('login')) return 'Open Stripe dashboard'
                        return 'Open Stripe task'
                }

                if (!accountId) return 'Start Stripe Connect setup'
                if (!detailsSubmitted) return 'Continue onboarding on Stripe'
                if (requirements.length > 0) return 'Complete Stripe requirements'
                if (!payoutsEnabled) return 'Check status on Stripe'
                return 'Open Stripe Connect'
        }, [needsUpdate, normalizedLinkType, accountId, detailsSubmitted, requirements, payoutsEnabled])

        const handleOpenStripe = () => {
                if (needsUpdate) {
                        if (missingReturnUrl) {
                                toast.error(
                                        'Stripe cannot create the onboarding link because the return and refresh URLs are missing. Please refresh after updating the configuration.'
                                )
                                return
                        }

                        if (!nextActionUrl) {
                                toast.error('Stripe did not return a link. Refresh the status and try again later.')
                                return
                        }

                        window.open(nextActionUrl, '_blank', 'noopener')
                        return
                }

                let payload: CreateStripeConnectAccountPayload | undefined

                if (!accountId) {
                        if (!acknowledgeCreate) {
                                toast.error('Please confirm the Stripe Connect acknowledgment before continuing.')
                                return
                        }

                        const selectedCountry = countryOption?.value
                        if (!selectedCountry) {
                                toast.error('Please choose a country before continuing.')
                                return
                        }

                        payload = { country: selectedCountry }
                }

                void createAccountMutation.mutateAsync(payload)
        }

        const handleDeleteAccount = () => {
                if (!accountId) {
                        return
                }

                if (!acknowledgeDelete) {
                        toast.error('Please confirm the deletion acknowledgment before continuing.')
                        return
                }

                void deleteAccountMutation.mutateAsync()
        }

	return (
		<div className='space-y-8'>
			<div>
				<div className='inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary'>
					<Sparkles className='h-4 w-4' />
					Stripe Connect
				</div>
				<h1 className='mt-3 text-2xl font-semibold text-slate-900'>Get paid</h1>
                                <p className='mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500'>
                                        Connect Stripe Connect to receive payments for projects on our platform. You can reopen the onboarding flow whenever you need to finish verification.{' '}
                                        <Link
                                                to={routes.comons.policies.connectAccount}
                                                className='font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:text-secondary'
                                        >
                                                Review the Stripe Connect account policy
                                        </Link>{' '}
                                        to understand the requirements and limitations.
                                </p>
			</div>

			<div className='grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
				<section className='space-y-6 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
					<header className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
						<div className='space-y-1.5'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Stripe setup</p>
                                                        <h2 className='text-lg font-semibold text-slate-900'>Create or continue your account</h2>
                                                        <p className='text-sm leading-relaxed text-slate-500'>Open the Stripe onboarding flow whenever you need to finish verification.</p>
						</div>
						<div className='flex flex-wrap items-center gap-2.5'>
							<button
								type='button'
								className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary'
								onClick={() => refetch()}
								disabled={loading}
							>
                                                                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                                                Refresh status
							</button>
							<button
								type='button'
								className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70'
                                                                onClick={handleOpenStripe}
                                                                disabled={
                                                                        createAccountMutation.isPending ||
                                                                        (needsUpdate
                                                                                ? !nextActionUrl || missingReturnUrl
                                                                                : !countryLocked &&
                                                                                  (!countryOption?.value ||
                                                                                          !acknowledgeCreate))
                                                                }
                                                        >
                                                                <ExternalLink className='h-4 w-4' />
                                                                {createAccountMutation.isPending ? 'Opening Stripe…' : callToActionLabel}
                                                        </button>
                                                </div>
                                        </header>

                                        {nextActionBanner ? (
                                                <StatusBanner
                                                        tone={nextActionBanner.tone}
                                                        title={nextActionBanner.title}
                                                        description={nextActionBanner.description}
                                                />
                                        ) : null}

                                        {!countryLocked ? (
                                                <div className='rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4 text-xs leading-relaxed text-sky-700'>
                                                        <div className='flex items-start gap-3'>
                                                                <Info className='mt-0.5 h-4 w-4 flex-shrink-0' />
                                                                <div className='space-y-2 text-left text-slate-600'>
                                                                        <p className='text-sm font-semibold text-sky-800'>Confirm before creating your account</p>
                                                                        <p>
                                                                                Stripe will verify your identity and store your payout details. Double-check your information before you start the onboarding flow.
                                                                        </p>
                                                                        <label htmlFor='acknowledge-create' className='flex items-start gap-2 text-left text-slate-600'>
                                                                                <input
                                                                                        id='acknowledge-create'
                                                                                        type='checkbox'
                                                                                        className='mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary'
                                                                                        checked={acknowledgeCreate}
                                                                                        onChange={event => setAcknowledgeCreate(event.target.checked)}
                                                                                />
                                                                                <span className='text-xs leading-relaxed text-slate-600 sm:text-sm'>
                                                                                        I confirm that the details I share with Stripe are accurate and that I will follow their verification requirements.
                                                                                </span>
                                                                        </label>
                                                                </div>
                                                        </div>
                                                </div>
                                        ) : null}

                                        {overview.tone !== 'success' ? (
                                                <StatusBanner
                                                        tone={overview.tone}
                                                        title={overview.title}
                                                        description={overview.description}
                                                />
                                        ) : null}

                                        {showBankCard ? (
                                                <div className={`rounded-2xl border p-5 ${toneBannerClass[bankTone]}`}>
                                                        <div className='flex items-start gap-3'>
                                                                <span
                                                                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${toneBadgeClass[bankTone]}`}
                                                                >
                                                                        {toneIcon[bankTone]}
                                                                </span>
                                                                <div className='space-y-1.5'>
                                                                        <p className={`text-sm font-semibold ${toneTitleClass[bankTone]}`}>
                                                                                Payout destination
                                                                        </p>
                                                                        <p className='text-xs leading-relaxed text-slate-600'>
                                                                                {bankDescription}
                                                                        </p>
                                                                        {detailList(bankDetails)}
                                                                </div>
                                                        </div>
                                                </div>
                                        ) : null}

                                        <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]'>
                                                <div className='space-y-3 text-sm leading-relaxed text-slate-600'>
                                                        <p>
                                                                {countryLocked
                                                                        ? `Stripe currently manages your account in ${accountCountryOption?.label ?? accountCountry ?? '—'}.`
                                                                        : 'Stripe uses this country to verify your identity and comply with local regulations.'}
                                                        </p>
                                                        <p className='text-xs text-slate-500'>
                                                                {countryLocked
                                                                        ? 'If you need to switch countries, contact support so we can remove the existing Stripe Connect account and restart onboarding.'
                                                                        : 'The list only shows countries that Stripe Connect supports for freelancers.'}
                                                        </p>
						</div>
						<div className='space-y-2'>
                                                        <CountrySelect
                                                                value={countryOption}
                                                                onChange={option => setCountryOption(option)}
                                                                options={stripeSupportedCountryOptions}
                                                                isDisabled={countryLocked || createAccountMutation.isPending}
                                                        />
                                                        {!countryLocked ? (
                                                                <p className='text-xs text-slate-400'>You can adjust this selection before opening Stripe.</p>
                                                        ) : null}
						</div>
					</div>

                                        {!countryLocked ? (
                                                <div className='rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-700'>
                                                        <div className='flex items-start gap-3'>
                                                                <AlertTriangle className='mt-0.5 h-4 w-4 flex-shrink-0' />
                                                                <div className='space-y-1'>
                                                                        <p className='text-sm font-semibold text-amber-800'>The selected country becomes locked after creation</p>
                                                                        <p>
                                                                                Once you complete Stripe onboarding, you can no longer change the country yourself. Confirm your selection before continuing.
                                                                        </p>
                                                                </div>
                                                        </div>
                                                </div>
                                        ) : null}

                                        {countryLocked ? (
                                                <div className='space-y-3 rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 text-sm leading-relaxed text-rose-700'>
                                                        <div className='flex items-start gap-3'>
                                                                <OctagonAlert className='mt-0.5 h-4 w-4 flex-shrink-0' />
                                                                <div className='space-y-2'>
                                                                        <p className='text-sm font-semibold text-rose-800'>Delete your Stripe Connect account</p>
                                                                        <p>
                                                                                Resolve any pending payouts, balances, or disputes before you submit the request. Stripe automatically blocks deletion if obligations remain.
                                                                        </p>
                                                                        <label htmlFor='acknowledge-delete' className='flex items-start gap-2 text-left'>
                                                                                <input
                                                                                        id='acknowledge-delete'
                                                                                        type='checkbox'
                                                                                        className='mt-1 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500'
                                                                                        checked={acknowledgeDelete}
                                                                                        onChange={event => setAcknowledgeDelete(event.target.checked)}
                                                                                />
                                                                                <span className='text-xs leading-relaxed text-rose-700 sm:text-sm'>
                                                                                        I understand that deleting this account is permanent and payouts will pause until I complete onboarding again.
                                                                                </span>
                                                                        </label>
                                                                        <p className='text-xs text-rose-600'>
                                                                                Need details?{' '}
                                                                                <Link
                                                                                        to={routes.comons.policies.connectAccount}
                                                                                        className='font-semibold text-rose-700 underline decoration-rose-300 underline-offset-4 hover:text-rose-800'
                                                                                >
                                                                                        Review the policy
                                                                                </Link>
                                                                                .
                                                                        </p>
                                                                </div>
                                                        </div>
                                                        <button
                                                                type='button'
                                                                className='inline-flex items-center justify-center gap-2 rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-70'
                                                                onClick={handleDeleteAccount}
                                                                disabled={isDeleting || !acknowledgeDelete}
                                                        >
                                                                {isDeleting ? 'Deleting…' : 'Delete Stripe Connect account'}
                                                        </button>
                                                </div>
                                        ) : null}
                                </section>

				<aside className='space-y-4'>
                                        <div className='space-y-5 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                                                <div className='space-y-1'>
                                                        <h3 className='text-sm font-semibold text-slate-900'>What does Stripe require?</h3>
                                                        <p className='text-xs leading-relaxed text-slate-500'>Stripe complies with Know Your Customer (KYC) regulations, so they may request:</p>
                                                </div>
                                                <div className='space-y-3 text-xs leading-relaxed text-slate-600'>
                                                        <div className='flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3'>
                                                                <CheckCircle2 className='mt-0.5 h-3.5 w-3.5 text-emerald-500' />
                                                                <p>Personal information: full name, date of birth, residential address, and valid identification documents.</p>
                                                        </div>
                                                        <div className='flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3'>
                                                                <CheckCircle2 className='mt-0.5 h-3.5 w-3.5 text-emerald-500' />
                                                                <p>Bank account details so Stripe can send payouts to you.</p>
                                                        </div>
                                                        <div className='flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3'>
                                                                <CheckCircle2 className='mt-0.5 h-3.5 w-3.5 text-emerald-500' />
                                                                <p>Additional documents depending on your country (e.g., proof of address or business registration).</p>
                                                        </div>
                                                </div>
                                                <div className='rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-primary'>
                                                        When you're done, return to this page and click “Refresh status” to sync your data. If you need help, reach out to our support team.
                                                </div>
                                        </div>
                                        <div className='rounded-3xl border border-sky-200/60 bg-sky-50/60 p-5 text-xs leading-relaxed text-sky-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm'>
                                                <p>Pro tip: Complete each step in the Stripe flow and keep copies of the documents you upload for future reference.</p>
                                                <p className='mt-2'>Our support team is ready to help if Stripe asks for unusual information.</p>
                                        </div>
                                </aside>
			</div>

                        <section className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                                <div className='space-y-1'>
                                        <h2 className='text-lg font-semibold text-slate-900'>Stripe status details</h2>
                                        <p className='text-sm text-slate-500'>Track your verification progress, country, and payout status.</p>
                                </div>
                                <div className='mt-5'>
                                        {loading ? (
                                                <div className='flex h-32 items-center justify-center gap-3 text-xs text-slate-500'>
                                                        <span className='loading loading-spinner loading-md' /> Loading Stripe status…
                                                </div>
                                        ) : (
                                                renderSummary(sections)
                                        )}
                                </div>
                        </section>
</div>
)
}

export default GetPaidPage
