import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ExternalLink, Info, OctagonAlert, RefreshCcw, Sparkles } from 'lucide-react'
import { toast } from 'react-toastify'
import {
        createStripeConnectAccount,
        getStripeConnectAccount,
        type CreateStripeConnectAccountPayload,
        type StripeConnectAccount,
        type StripeConnectAccountResponse
} from '~/apis/stripe-connect.api'
import CountrySelect, { type CountryOption } from '~/components/form/CountryAutocomplete'
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

const toneIcon: Record<Tone, JSX.Element> = {
        success: <CheckCircle2 className='h-4 w-4' />,
        warning: <AlertTriangle className='h-4 w-4' />,
        info: <Info className='h-4 w-4' />,
        danger: <OctagonAlert className='h-4 w-4' />
}

function extractAccount(payload?: StripeConnectAccountResponse | null): StripeConnectAccount | null {
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
}) => {
        const { hasAccount, detailsSubmitted, payoutsEnabled, requirements } = params

        if (!hasAccount) {
                return {
                        tone: 'warning' as Tone,
                        title: 'Bạn chưa kết nối Stripe Connect',
                        description:
                                'Bắt đầu quy trình Stripe Connect để Stripe xác minh danh tính và thiết lập kênh thanh toán cho bạn.'
                }
        }

        if (!detailsSubmitted) {
                return {
                        tone: 'warning' as Tone,
                        title: 'Hoàn tất biểu mẫu Stripe',
                        description:
                                'Bạn đã tạo tài khoản nhưng vẫn cần hoàn tất các bước onboarding trên Stripe để bắt đầu nhận tiền.'
                }
        }

        if (requirements.length > 0) {
                return {
                        tone: 'danger' as Tone,
                        title: 'Stripe yêu cầu thêm thông tin',
                        description:
                                'Stripe vẫn còn một vài mục cần bạn bổ sung trước khi có thể kích hoạt thanh toán. Nhấn "Mở Stripe Connect" để hoàn tất.'
                }
        }

        if (!payoutsEnabled) {
                return {
                        tone: 'info' as Tone,
                        title: 'Đang chờ Stripe bật payouts',
                        description:
                                'Stripe đã nhận đủ thông tin và sẽ bật thanh toán sau khi hoàn tất việc xem xét. Bạn có thể kiểm tra lại sau.'
                }
        }

        return {
                tone: 'success' as Tone,
                title: 'Stripe Connect đã sẵn sàng',
                description: 'Tài khoản Stripe Connect của bạn đã được xác minh và payouts đang hoạt động.'
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
        countryName?: string
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
                title: 'Quốc gia Stripe Connect',
                description: countryName
                        ? `Stripe đang thiết lập tài khoản của bạn tại ${countryName}.`
                        : 'Bạn vẫn chưa chọn quốc gia để bắt đầu quy trình Stripe Connect.'
        })

        sections.push({
                key: 'account',
                tone: accountId ? 'success' : 'warning',
                title: 'Tài khoản Stripe Connect',
                description: accountId
                        ? `Đã tạo tài khoản Stripe với mã ${accountId}.`
                        : 'Bạn vẫn chưa tạo tài khoản Stripe cho freelancer của mình.'
        })

        sections.push({
                key: 'details',
                tone: detailsSubmitted ? 'success' : 'warning',
                title: 'Hồ sơ xác minh',
                description: detailsSubmitted
                        ? 'Bạn đã gửi thông tin xác minh cần thiết cho Stripe.'
                        : 'Stripe yêu cầu bạn hoàn tất biểu mẫu xác minh danh tính.'
        })

        sections.push({
                key: 'payouts',
                tone: payoutsEnabled ? 'success' : requirements.length > 0 ? 'danger' : 'info',
                title: 'Trạng thái payouts',
                description: payoutsEnabled
                        ? 'Payouts đã được bật — bạn có thể nhận tiền từ hệ thống.'
                        : requirements.length > 0
                                ? 'Stripe hiện đang chặn payouts cho tới khi bạn bổ sung đủ thông tin.'
                                : 'Stripe sẽ bật payouts ngay sau khi họ hoàn tất kiểm duyệt.'
        })

        sections.push({
                key: 'requirements',
                tone: requirements.length > 0 ? 'danger' : 'info',
                title: requirements.length > 0 ? 'Thông tin cần bổ sung' : 'Yêu cầu từ Stripe',
                description: requirements.length > 0
                        ? 'Stripe vẫn yêu cầu các hạng mục sau:'
                        : 'Hiện Stripe không còn yêu cầu bổ sung thông tin nào khác.',
                extra: requirementList(requirements)
        })

        return sections
}

const renderSummary = (sections: ReturnType<typeof summarySections>) => {
        return (
                <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                        {sections.map(section => (
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
        const { data, isLoading, isFetching, refetch } = useQuery({
                queryKey: ['stripe-connect-account'],
                queryFn: getStripeConnectAccount
        })

        const createAccountMutation = useMutation({
                mutationFn: (payload?: CreateStripeConnectAccountPayload) =>
                        createStripeConnectAccount(payload),
                onSuccess: res => {
                        const urlCandidate = pickString(res?.onboardingUrl, res?.accountLinkUrl, res?.url, res?.loginUrl)

                        if (urlCandidate) {
                                window.open(urlCandidate, '_blank', 'noopener')
                        }

                        toast.success('Đã tạo đường dẫn Stripe Connect thành công!')
                        refetch()
                },
                onError: () => {
                        toast.error('Không thể mở Stripe Connect. Vui lòng thử lại sau.')
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

        const detailsSubmitted = useMemo(
                () => pickBoolean(account?.detailsSubmitted, account?.details_submitted),
                [account]
        )
        const payoutsEnabled = useMemo(
                () => pickBoolean(account?.payoutsEnabled, account?.payouts_enabled),
                [account]
        )
        const requirements = useMemo(() => requirementsFromAccount(account), [account])

        const overview = useMemo(
                () =>
                        statusDescription({
                                hasAccount: Boolean(accountId),
                                detailsSubmitted,
                                payoutsEnabled,
                                requirements
                        }),
                [accountId, detailsSubmitted, payoutsEnabled, requirements]
        )

        const sections = useMemo(
                () =>
                        summarySections(
                                accountId,
                                detailsSubmitted,
                                payoutsEnabled,
                                requirements,
                                accountCountryOption?.label
                        ),
                [accountId, detailsSubmitted, payoutsEnabled, requirements, accountCountryOption]
        )

        const loading = isLoading || isFetching
        const countryLocked = Boolean(accountId)

        const callToActionLabel = useMemo(() => {
                if (!accountId) return 'Bắt đầu thiết lập Stripe Connect'
                if (!detailsSubmitted) return 'Tiếp tục thiết lập trên Stripe'
                if (requirements.length > 0) return 'Hoàn tất yêu cầu từ Stripe'
                if (!payoutsEnabled) return 'Kiểm tra trạng thái trên Stripe'
                return 'Mở Stripe Connect'
        }, [accountId, detailsSubmitted, requirements, payoutsEnabled])

        const handleOpenStripe = () => {
                let payload: CreateStripeConnectAccountPayload | undefined

                if (!accountId) {
                        const selectedCountry = countryOption?.value
                        if (!selectedCountry) {
                                toast.error('Vui lòng chọn quốc gia trước khi tiếp tục.')
                                return
                        }

                        payload = { country: selectedCountry }
                }

                void createAccountMutation.mutateAsync(payload)
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
					Kết nối Stripe Connect để nhận thanh toán cho các dự án trên nền tảng. Bạn có thể mở lại quy trình bất cứ lúc nào để hoàn tất xác minh và bật payouts.
				</p>
			</div>

			<div className='grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
				<section className='space-y-6 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
					<header className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
						<div className='space-y-1.5'>
							<p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Thiết lập Stripe</p>
							<h2 className='text-lg font-semibold text-slate-900'>Tạo hoặc tiếp tục tài khoản của bạn</h2>
							<p className='text-sm leading-relaxed text-slate-500'>Chủ động mở trang onboarding Stripe bất cứ lúc nào để hoàn tất xác minh.</p>
						</div>
						<div className='flex flex-wrap items-center gap-2.5'>
							<button
								type='button'
								className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary'
								onClick={() => refetch()}
								disabled={loading}
							>
								<RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
								Làm mới trạng thái
							</button>
							<button
								type='button'
								className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70'
								onClick={handleOpenStripe}
								disabled={
									createAccountMutation.isPending ||
									(!countryLocked && !countryOption?.value)
								}
							>
								<ExternalLink className='h-4 w-4' />
								{createAccountMutation.isPending ? 'Đang mở Stripe…' : callToActionLabel}
							</button>
						</div>
					</header>

					<StatusBanner tone={overview.tone} title={overview.title} description={overview.description} />

					<div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]'>
						<div className='space-y-3 text-sm leading-relaxed text-slate-600'>
							<p>
								{countryLocked
									? `Stripe đang quản lý tài khoản của bạn tại ${accountCountryOption?.label ?? accountCountry ?? '—'}.`
									: 'Stripe sử dụng quốc gia này để xác minh danh tính và tuân thủ quy định pháp lý tại nơi bạn sinh sống.'}
							</p>
							<p className='text-xs text-slate-500'>
								{countryLocked
									? 'Nếu cần thay đổi quốc gia, bạn sẽ cần làm việc với đội ngũ hỗ trợ để xóa tài khoản Stripe Connect hiện tại và tạo lại.'
									: 'Danh sách dưới đây chỉ bao gồm các quốc gia Stripe Connect hỗ trợ cho freelancer.'}
							</p>
						</div>
						<div className='space-y-2'>
							<CountrySelect
								value={countryOption}
								onChange={option => setCountryOption(option)}
								isDisabled={countryLocked || createAccountMutation.isPending}
							/>
							{!countryLocked ? (
								<p className='text-xs text-slate-400'>Bạn vẫn có thể cập nhật lựa chọn trước khi mở Stripe.</p>
							) : null}
						</div>
					</div>

					<div className='rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-700'>
						<div className='flex items-start gap-3'>
							<AlertTriangle className='mt-0.5 h-4 w-4 flex-shrink-0' />
							<div className='space-y-1'>
								<p className='text-sm font-semibold'>Quốc gia sẽ bị khóa sau khi tạo tài khoản</p>
								<p>
									{countryLocked
										? 'Bạn đã tạo tài khoản Stripe Connect nên quốc gia hiện được cố định. Để chuyển sang quốc gia khác, hãy xóa tài khoản Stripe Connect và khởi tạo lại quy trình.'
										: 'Khi hoàn tất onboarding Stripe, lựa chọn quốc gia sẽ bị khóa. Hãy đảm bảo bạn chọn đúng trước khi tiếp tục.'}
								</p>
							</div>
						</div>
					</div>
				</section>

				<aside className='space-y-4'>
					<div className='space-y-5 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
						<div className='space-y-1'>
							<h3 className='text-sm font-semibold text-slate-900'>Stripe cần những gì?</h3>
							<p className='text-xs leading-relaxed text-slate-500'>Stripe tuân thủ các quy định về KYC (Know Your Customer), vì vậy họ có thể yêu cầu:</p>
						</div>
						<div className='space-y-3 text-xs leading-relaxed text-slate-600'>
							<div className='flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3'>
								<CheckCircle2 className='mt-0.5 h-3.5 w-3.5 text-emerald-500' />
								<p>Thông tin cá nhân: họ tên, ngày sinh, địa chỉ cư trú và giấy tờ tùy thân hợp lệ.</p>
							</div>
							<div className='flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3'>
								<CheckCircle2 className='mt-0.5 h-3.5 w-3.5 text-emerald-500' />
								<p>Chi tiết tài khoản ngân hàng để Stripe chuyển khoản payouts cho bạn.</p>
							</div>
							<div className='flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3'>
								<CheckCircle2 className='mt-0.5 h-3.5 w-3.5 text-emerald-500' />
								<p>Các tài liệu bổ sung tùy từng quốc gia (ví dụ: giấy phép kinh doanh hoặc xác nhận địa chỉ).</p>
							</div>
						</div>
						<div className='rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-primary'>
							Khi hoàn tất, hãy quay lại trang này và nhấn “Làm mới trạng thái” để đồng bộ dữ liệu. Nếu cần hỗ trợ, vui lòng liên hệ đội ngũ của chúng tôi.
						</div>
					</div>
					<div className='rounded-3xl border border-sky-200/60 bg-sky-50/60 p-5 text-xs leading-relaxed text-sky-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm'>
						<p>Mẹo nhỏ: Hoàn thành từng bước trong quy trình Stripe và giữ lại các tài liệu đã tải lên để tiện kiểm tra về sau.</p>
						<p className='mt-2'>Đội ngũ hỗ trợ luôn sẵn sàng đồng hành nếu Stripe yêu cầu thông tin bổ sung bất thường.</p>
					</div>
				</aside>
			</div>

			<section className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
				<div className='space-y-1'>
					<h2 className='text-lg font-semibold text-slate-900'>Chi tiết trạng thái Stripe</h2>
					<p className='text-sm text-slate-500'>Theo dõi tiến trình xác minh, quốc gia và trạng thái payouts của bạn.</p>
				</div>
				<div className='mt-5'>
					{loading ? (
						<div className='flex h-32 items-center justify-center gap-3 text-xs text-slate-500'>
							<span className='loading loading-spinner loading-md' /> Đang tải trạng thái Stripe…
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
