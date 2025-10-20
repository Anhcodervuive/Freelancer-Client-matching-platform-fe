import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
	AlertTriangle,
	BadgeDollarSign,
	CalendarClock,
	ChevronDown,
	Filter,
	LifeBuoy,
	RefreshCcw,
	Search,
	ShieldCheck,
	Undo2,
	User2
} from 'lucide-react'
import { toast } from 'react-toastify'

import { getAdminDisputes, joinDisputeAsAdmin } from '~/apis/admin/dispute.api'
import { routes } from '~/config/routes'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { AdminDisputeListItem, AdminJoinDisputeInput, DecimalLike, DisputeUserSummary } from '~/types/dispute'
import { DisputeNegotiationStatus, DisputeStatus } from '~/types/dispute'

const STATUS_OPTIONS = Object.values(DisputeStatus)

const statusClassMap: Partial<Record<DisputeStatus, string>> = {
	[DisputeStatus.OPEN]: 'badge-warning',
	[DisputeStatus.NEGOTIATION]: 'badge-info',
	[DisputeStatus.AWAITING_ARBITRATION_FEES]: 'badge-warning',
	[DisputeStatus.ARBITRATION]: 'badge-secondary',
	[DisputeStatus.RESOLVED_RELEASE_ALL]: 'badge-success',
	[DisputeStatus.RESOLVED_REFUND_ALL]: 'badge-success',
	[DisputeStatus.RESOLVED_SPLIT]: 'badge-success',
	[DisputeStatus.CANCELED]: 'badge-neutral',
	[DisputeStatus.EXPIRED]: 'badge-neutral'
}

const formatDateTime = (value?: string | null) => {
	if (!value) return '—'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleString()
}

const humanizeStatus = (status?: DisputeStatus | null) =>
	status
		? status
				.split('_')
				.map(part => part.charAt(0) + part.slice(1).toLowerCase())
				.join(' ')
		: 'Unknown'

const toNumber = (value: DecimalLike | null | undefined) => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null
	}

	if (typeof value === 'string') {
		const parsed = Number(value)
		return Number.isFinite(parsed) ? parsed : null
	}

	return null
}

const formatCurrencyValue = (value: DecimalLike | null | undefined, currency?: string | null) => {
	const amount = toNumber(value)
	if (amount === null) return '—'

	const normalizedCurrency = currency && currency.trim() ? currency : 'USD'

	try {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: normalizedCurrency,
			maximumFractionDigits: 2
		}).format(amount)
	} catch {
		return `${amount.toLocaleString()} ${normalizedCurrency}`.trim()
	}
}

const humanizeNegotiationStatus = (status?: DisputeNegotiationStatus | null) =>
	status
		? status
				.split('_')
				.map(part => part.charAt(0) + part.slice(1).toLowerCase())
				.join(' ')
		: '—'

const formatBoolean = (value?: boolean | null, positiveLabel: string = 'Có', negativeLabel: string = 'Không') => {
	if (value === undefined || value === null) {
		return '—'
	}
	return value ? positiveLabel : negativeLabel
}

const formatUserName = (user?: DisputeUserSummary | null, fallback?: string | null) => {
	if (!user) {
		return fallback ?? '—'
	}

	const record = user as Record<string, unknown>
	const displayName = (() => {
		const direct = record.displayName ?? record.name ?? record.fullName
		if (typeof direct === 'string' && direct.trim().length) {
			return direct.trim()
		}
		if (user.profile && typeof user.profile === 'object') {
			const profileDisplay = (user.profile as Record<string, unknown>).displayName
			if (typeof profileDisplay === 'string' && profileDisplay.trim().length) {
				return profileDisplay.trim()
			}
		}
		return undefined
	})()

	if (displayName) {
		return displayName
	}

	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
	if (fullName.length) return fullName
	if (user.profile && typeof user.profile === 'object') {
		const profileName = [
			(user.profile as Record<string, unknown>).firstName,
			(user.profile as Record<string, unknown>).lastName
		]
			.filter(value => typeof value === 'string')
			.join(' ')
			.trim()
		if (profileName.length) {
			return profileName
		}
	}
	return user.id || fallback || '—'
}

const pickBooleanFlag = (record: AdminDisputeListItem, keys: string[]) => {
	for (const key of keys) {
		const value = record[key]
		if (typeof value === 'boolean') {
			return value
		}
	}
	return undefined
}

type NeedsAdminOption = 'all' | 'true' | 'false'

export default function AdminDisputeListPage() {
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(10)
	const [search, setSearch] = useState('')
	const debouncedSearch = useDebounce(search, 500)

	const [selectedStatuses, setSelectedStatuses] = useState<DisputeStatus[]>([])
	const [needsAdminFilter, setNeedsAdminFilter] = useState<NeedsAdminOption>('all')
	const [contractId, setContractId] = useState('')
	const [clientId, setClientId] = useState('')
	const [freelancerId, setFreelancerId] = useState('')
	const [createdFrom, setCreatedFrom] = useState('')
	const [createdTo, setCreatedTo] = useState('')
	const [filtersOpen, setFiltersOpen] = useState(false)

	const [joinTarget, setJoinTarget] = useState<AdminDisputeListItem | null>(null)
	const [joinReason, setJoinReason] = useState('')

	const queryClient = useQueryClient()

	const dateRangeError = useMemo(() => {
		if (!createdFrom || !createdTo) return false
		return new Date(createdFrom) > new Date(createdTo)
	}, [createdFrom, createdTo])

	const queryKey = useMemo(
		() => [
			'admin-disputes',
			{
				page,
				limit,
				statuses: selectedStatuses.join(','),
				needsAdminFilter,
				search: debouncedSearch,
				contractId,
				clientId,
				freelancerId,
				createdFrom,
				createdTo
			}
		],
		[
			page,
			limit,
			selectedStatuses,
			needsAdminFilter,
			debouncedSearch,
			contractId,
			clientId,
			freelancerId,
			createdFrom,
			createdTo
		]
	)

	const filters = useMemo(
		() => ({
			page,
			limit,
			status: selectedStatuses.length ? selectedStatuses : undefined,
			needsAdmin: needsAdminFilter === 'all' ? undefined : needsAdminFilter === 'true',
			search: debouncedSearch || undefined,
			contractId: contractId.trim() || undefined,
			clientId: clientId.trim() || undefined,
			freelancerId: freelancerId.trim() || undefined,
			createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined,
			createdTo: createdTo ? new Date(createdTo).toISOString() : undefined
		}),
		[
			page,
			limit,
			selectedStatuses,
			needsAdminFilter,
			debouncedSearch,
			contractId,
			clientId,
			freelancerId,
			createdFrom,
			createdTo
		]
	)

	const { data, isLoading, isFetching, isError, refetch, error } = useQuery({
		queryKey,
		queryFn: () => getAdminDisputes(filters),
		enabled: !dateRangeError
	})

	console.log(error)

	const disputes = data?.data ?? []
	const total = data?.total ?? 0
	const pages = Math.max(1, Math.ceil(total / limit))

	const joinMutation = useMutation({
		mutationFn: ({ disputeId, payload }: { disputeId: string; payload: AdminJoinDisputeInput }) =>
			joinDisputeAsAdmin(disputeId, payload),
		onSuccess: async () => {
			toast.success('Đã tham gia tranh chấp với tư cách admin')
			setJoinTarget(null)
			setJoinReason('')
			await queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
		},
		onError: () => {
			toast.error('Không thể tham gia tranh chấp, vui lòng thử lại sau')
		}
	})

	const toggleStatus = (status: DisputeStatus) => {
		setSelectedStatuses(prev => {
			if (prev.includes(status)) {
				return prev.filter(item => item !== status)
			}
			return [...prev, status]
		})
		setPage(1)
	}

	const resetFilters = () => {
		setSelectedStatuses([])
		setNeedsAdminFilter('all')
		setContractId('')
		setClientId('')
		setFreelancerId('')
		setCreatedFrom('')
		setCreatedTo('')
		setSearch('')
		setPage(1)
	}

	const handleJoin = () => {
		if (!joinTarget) return
		joinMutation.mutate({
			disputeId: joinTarget.id,
			payload: joinReason.trim() ? { reason: joinReason.trim() } : {}
		})
	}

	const limitOptions = [10, 20, 50]

	return (
		<div className='space-y-6'>
			<header className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
				<div className='space-y-1'>
					<h1 className='flex items-center gap-2 text-2xl font-semibold'>
						<BadgeDollarSign className='size-6 text-primary' /> Tranh chấp
					</h1>
					<p className='text-sm text-base-content/70'>
						Theo dõi và xử lý các tranh chấp giữa khách hàng và freelancer.
					</p>
				</div>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
					<div className='flex w-full flex-wrap items-center justify-end gap-2'>
						<div className='form-control w-full sm:w-72'>
							<label className='input input-bordered flex items-center gap-2'>
								<Search className='size-4 opacity-70' />
								<input
									type='search'
									className='grow bg-transparent outline-none'
									placeholder='Từ khóa, ghi chú, số hợp đồng...'
									value={search}
									onChange={event => {
										setSearch(event.target.value)
										setPage(1)
									}}
								/>
							</label>
						</div>
						<button
							type='button'
							className='btn btn-ghost'
							onClick={() => setFiltersOpen(open => !open)}
							aria-expanded={filtersOpen}>
							<Filter className='size-4' /> Bộ lọc
							<ChevronDown className={['size-4 transition', filtersOpen ? 'rotate-180' : ''].join(' ')} />
						</button>
						<button type='button' className='btn btn-ghost' onClick={resetFilters} disabled={isFetching}>
							<Undo2 className='size-4' /> Đặt lại
						</button>
						<button type='button' className='btn' onClick={() => refetch()} disabled={isFetching}>
							<RefreshCcw className='size-4' /> Làm mới
						</button>
					</div>
				</div>
			</header>

			{filtersOpen ? (
				<section className='card border border-base-200 bg-base-100 shadow-sm'>
					<div className='card-body space-y-4'>
						<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Lọc theo hợp đồng</span>
								<input
									className='input input-bordered'
									placeholder='ID hợp đồng'
									value={contractId}
									onChange={event => {
										setContractId(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Lọc theo khách hàng</span>
								<input
									className='input input-bordered'
									placeholder='ID khách hàng'
									value={clientId}
									onChange={event => {
										setClientId(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Lọc theo freelancer</span>
								<input
									className='input input-bordered'
									placeholder='ID freelancer'
									value={freelancerId}
									onChange={event => {
										setFreelancerId(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Ngày tạo từ</span>
								<input
									type='date'
									className='input input-bordered'
									value={createdFrom}
									onChange={event => {
										setCreatedFrom(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Đến ngày</span>
								<input
									type='date'
									className='input input-bordered'
									value={createdTo}
									onChange={event => {
										setCreatedTo(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Cần admin can thiệp</span>
								<select
									className='select select-bordered'
									value={needsAdminFilter}
									onChange={event => {
										setNeedsAdminFilter(event.target.value as NeedsAdminOption)
										setPage(1)
									}}>
									<option value='all'>Tất cả</option>
									<option value='true'>Chỉ hiển thị</option>
									<option value='false'>Đã xử lý</option>
								</select>
							</label>
						</div>

						<div>
							<span className='label-text text-sm font-medium'>Trạng thái tranh chấp</span>
							<div className='mt-2 max-h-48 overflow-y-auto rounded-lg border border-dashed border-base-300 bg-base-200/40 p-3'>
								{STATUS_OPTIONS.map(status => {
									const checked = selectedStatuses.includes(status)
									return (
										<label key={status} className='flex items-center gap-3 rounded-md px-2 py-1 hover:bg-base-100'>
											<input
												type='checkbox'
												className='checkbox checkbox-sm'
												checked={checked}
												onChange={() => toggleStatus(status)}
											/>
											<span className='text-sm'>{humanizeStatus(status)}</span>
										</label>
									)
								})}
							</div>
						</div>

						{dateRangeError ? (
							<div className='alert alert-warning shadow-sm'>
								<CalendarClock className='size-5' />
								<span>Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.</span>
							</div>
						) : null}
					</div>
				</section>
			) : null}

			<section className='card bg-base-100 shadow-sm'>
				<div className='card-body space-y-5'>
					{isLoading ? (
						<div className='space-y-4'>
							{Array.from({ length: 3 }).map((_, index) => (
								<div key={index} className='space-y-3 rounded-2xl border border-base-200 p-5'>
									<div className='skeleton h-6 w-1/3' />
									<div className='skeleton h-4 w-2/3' />
									<div className='skeleton h-32 w-full' />
								</div>
							))}
						</div>
					) : null}

					{!isLoading && isError ? (
						<div className='alert alert-error'>
							<ShieldCheck className='size-5' />
							<span>Không thể tải dữ liệu tranh chấp. Vui lòng thử lại.</span>
						</div>
					) : null}

					{!isLoading && !isError && disputes.length === 0 ? (
						<div className='py-12 text-center text-base-content/70'>Không tìm thấy tranh chấp phù hợp.</div>
					) : null}

					{!isLoading && !isError && isFetching ? (
						<div className='flex justify-end'>
							<span className='badge badge-outline gap-2 text-xs'>
								<span className='loading loading-spinner size-3' /> Đang cập nhật...
							</span>
						</div>
					) : null}

					{!isLoading && !isError && disputes.length > 0 ? (
						<div className='space-y-4'>
							{disputes.map(item => {
								const contractTitle =
									item.contract?.title ||
									item.contract?.name ||
									item.contract?.label ||
									item.contract?.slug ||
									item.contract?.description ||
									''
								const milestoneTitle =
									item.milestone?.title || item.milestone?.name || item.milestone?.description || ''
								const baseDispute = item.dispute ?? null
								const status = item.status ?? baseDispute?.status
								const amounts = item.amounts ?? null
								const metrics = item.metrics ?? null
								const parties = item.parties ?? null
								const client = item.client ?? parties?.client ?? null
								const freelancer = item.freelancer ?? parties?.freelancer ?? null
								const adminUser = item.admin ?? null
								const milestoneRecord = item.milestone ? (item.milestone as Record<string, unknown>) : null
								const milestoneCurrency =
									milestoneRecord && typeof milestoneRecord.currency === 'string'
										? (milestoneRecord.currency as string)
										: null
								let fundedAmount: DecimalLike | null | undefined = amounts?.funded
								if ((fundedAmount === undefined || fundedAmount === null) && milestoneRecord) {
									const milestoneAmount = milestoneRecord.amount
									if (
										typeof milestoneAmount === 'number' ||
										(typeof milestoneAmount === 'string' && milestoneAmount !== '')
									) {
										fundedAmount = milestoneAmount as DecimalLike
									}
								}
								const currency =
									typeof amounts?.currency === 'string' && amounts.currency.trim()
										? (amounts.currency as string)
										: milestoneCurrency
								const releasedAmount = amounts?.released
								const refundedAmount = amounts?.refunded
								const disputableAmount = amounts?.disputable
								const proposedRelease =
									amounts?.proposedRelease ?? baseDispute?.latestProposal?.releaseAmount ?? baseDispute?.proposedRelease
								const proposedRefund =
									amounts?.proposedRefund ?? baseDispute?.latestProposal?.refundAmount ?? baseDispute?.proposedRefund
								const responseDeadline = baseDispute?.responseDeadline ?? null
								const arbitrationDeadline = baseDispute?.arbitrationDeadline ?? null
								const negotiationCount =
									metrics?.negotiationCount ?? (baseDispute?.negotiations ? baseDispute.negotiations.length : null)
								const latestProposal = baseDispute?.latestProposal ?? null
								const latestProposalStatus = latestProposal?.status ?? null
								const lastProposalCreatedAt = metrics?.lastProposalCreatedAt ?? latestProposal?.createdAt ?? null
								const lastProposalRespondedAt = metrics?.lastProposalRespondedAt ?? latestProposal?.respondedAt ?? null
								const lastAdminJoinedAt = metrics?.lastAdminJoinedAt ?? null
								const fallbackNeedsAdmin =
									typeof item.needsAdmin === 'boolean'
										? item.needsAdmin
										: pickBooleanFlag(item, ['needs_admin', 'requiresAdmin', 'awaitingAdmin']) ?? false
								const fallbackJoined =
									typeof item.joined === 'boolean'
										? item.joined
										: pickBooleanFlag(item, ['isAdminParticipant', 'adminJoined', 'hasJoined']) ?? false
								const needsAdminFlag = Boolean(metrics?.needsAdmin ?? fallbackNeedsAdmin)
								const hasAdminJoinedFlag = Boolean(metrics?.hasAdminJoined ?? fallbackJoined)
								const isResponseOverdue = Boolean(
									metrics?.isResponseOverdue ??
										(responseDeadline ? new Date(responseDeadline).getTime() < Date.now() : false)
								)
								const adminNote = baseDispute?.note
								const arbFeePerParty = baseDispute?.arbFeePerParty
								const clientArbFeePaid = baseDispute?.clientArbFeePaid
								const freelancerArbFeePaid = baseDispute?.freelancerArbFeePaid
								const adminLabel = adminUser
									? formatUserName(adminUser)
									: hasAdminJoinedFlag
									? 'Đã tham gia'
									: 'Chưa tham gia'
								const joinDisabled = hasAdminJoinedFlag || joinMutation.isPending

								return (
									<article key={item.id} className='space-y-4 rounded-2xl border border-base-200 p-5 shadow-sm'>
										<div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
											<div className='space-y-2'>
												<div className='flex flex-wrap items-center gap-2'>
													<span
														className={[
															'badge',
															status ? statusClassMap[status] ?? 'badge-outline' : 'badge-outline'
														].join(' ')}>
														{humanizeStatus(status)}
													</span>
													<span className='font-semibold text-base-content'>#{item.id}</span>
													{needsAdminFlag ? (
														<span className='badge badge-warning gap-1 text-xs'>
															<LifeBuoy className='size-3.5' /> Cần admin
														</span>
													) : null}
													{hasAdminJoinedFlag ? (
														<span className='badge badge-success gap-1 text-xs'>Đã tham gia</span>
													) : null}
													{isResponseOverdue ? (
														<span className='badge badge-error gap-1 text-xs'>
															<AlertTriangle className='size-3.5' /> Quá hạn phản hồi
														</span>
													) : null}
												</div>
												<div className='flex flex-wrap items-center gap-3 text-xs text-base-content/70'>
													<span>Tạo: {formatDateTime(item.createdAt ?? baseDispute?.createdAt)}</span>
													<span>Cập nhật: {formatDateTime(item.updatedAt ?? baseDispute?.updatedAt)}</span>
												</div>
											</div>
											<div className='flex items-center gap-2'>
												<button
													type='button'
													className='btn btn-sm btn-primary'
													disabled={joinDisabled}
													onClick={() => {
														setJoinTarget(item)
														setJoinReason('')
													}}>
													{hasAdminJoinedFlag ? 'Đã tham gia' : 'Tham gia'}
												</button>
											</div>
										</div>

										{adminNote ? (
											<div className='rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm text-base-content/80'>
												<span className='font-medium text-primary'>Ghi chú:</span> {adminNote}
											</div>
										) : null}

										<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
											<div className='space-y-2 text-sm'>
												<h4 className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
													Hợp đồng &amp; mốc
												</h4>
												<div className='space-y-1'>
													<div className='font-medium text-base-content'>
														{contractTitle ||
															(item.contract?.id ? `Hợp đồng #${item.contract.id}` : 'Không rõ hợp đồng')}
													</div>
													<div className='text-xs text-base-content/70'>
														Mốc: {milestoneTitle || (item.milestone?.id ? `#${item.milestone.id}` : '—')}
													</div>
													{item.contract?.id ? (
														<Link to={routes.contracts.detail(item.contract.id)} className='link link-primary text-xs'>
															Xem hợp đồng
														</Link>
													) : null}
												</div>
											</div>

											<div className='space-y-3 text-sm'>
												<h4 className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
													Các bên liên quan
												</h4>
												<div className='flex items-start gap-2'>
													<User2 className='mt-1 size-4 text-base-content/60' />
													<div>
														<div className='font-medium text-base-content'>
															{formatUserName(client, item.contract?.clientId ?? null)}
														</div>
														<div className='text-xs text-base-content/60'>Khách hàng</div>
														<div className='text-xs text-base-content/60'>
															ID: {client?.id ?? item.contract?.clientId ?? '—'}
														</div>
													</div>
												</div>
												<div className='flex items-start gap-2'>
													<User2 className='mt-1 size-4 text-base-content/60' />
													<div>
														<div className='font-medium text-base-content'>
															{formatUserName(freelancer, item.contract?.freelancerId ?? null)}
														</div>
														<div className='text-xs text-base-content/60'>Freelancer</div>
														<div className='text-xs text-base-content/60'>
															ID: {freelancer?.id ?? item.contract?.freelancerId ?? '—'}
														</div>
													</div>
												</div>
											</div>

											<div className='space-y-2 text-sm'>
												<h4 className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
													Tài chính
												</h4>
												<div className='space-y-1'>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-base-content/70'>Ký quỹ</span>
														<span className='font-medium text-base-content'>
															{formatCurrencyValue(fundedAmount ?? null, currency)}
														</span>
													</div>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-base-content/70'>Đã giải ngân</span>
														<span className='font-medium text-base-content'>
															{formatCurrencyValue(releasedAmount ?? null, currency)}
														</span>
													</div>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-base-content/70'>Đã hoàn</span>
														<span className='font-medium text-base-content'>
															{formatCurrencyValue(refundedAmount ?? null, currency)}
														</span>
													</div>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-base-content/70'>Đang tranh chấp</span>
														<span className='font-medium text-base-content'>
															{formatCurrencyValue(disputableAmount ?? null, currency)}
														</span>
													</div>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-base-content/70'>Đề xuất trả freelancer</span>
														<span className='font-medium text-base-content'>
															{formatCurrencyValue(proposedRelease ?? null, currency)}
														</span>
													</div>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-base-content/70'>Đề xuất trả khách hàng</span>
														<span className='font-medium text-base-content'>
															{formatCurrencyValue(proposedRefund ?? null, currency)}
														</span>
													</div>
													{arbFeePerParty ? (
														<div className='flex items-center justify-between gap-2 text-xs'>
															<span className='text-base-content/70'>Phí trọng tài (mỗi bên)</span>
															<span className='font-medium text-base-content'>
																{formatCurrencyValue(arbFeePerParty, currency)}
															</span>
														</div>
													) : null}
													<div className='flex items-center justify-between gap-2 text-xs'>
														<span className='text-base-content/70'>Khách đã nộp phí</span>
														<span className='font-medium text-base-content'>{formatBoolean(clientArbFeePaid)}</span>
													</div>
													<div className='flex items-center justify-between gap-2 text-xs'>
														<span className='text-base-content/70'>Freelancer đã nộp phí</span>
														<span className='font-medium text-base-content'>{formatBoolean(freelancerArbFeePaid)}</span>
													</div>
												</div>
											</div>

											<div className='space-y-2 text-sm'>
												<h4 className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
													Hoạt động gần đây
												</h4>
												<div className='space-y-1'>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-base-content/70'>Lượt thương lượng</span>
														<span className='font-medium text-base-content'>
															{typeof negotiationCount === 'number' ? negotiationCount : '—'}
														</span>
													</div>
													<div className='flex items-center justify-between gap-2'>
														<span className='text-base-content/70'>Đề xuất mới nhất</span>
														<span className='font-medium text-base-content'>
															{humanizeNegotiationStatus(latestProposalStatus)}
														</span>
													</div>
													<div className='flex items-center justify-between gap-2 text-xs text-base-content/70'>
														<span>Hạn phản hồi</span>
														<span>{formatDateTime(responseDeadline)}</span>
													</div>
													<div className='flex items-center justify-between gap-2 text-xs text-base-content/70'>
														<span>Hạn trọng tài</span>
														<span>{formatDateTime(arbitrationDeadline)}</span>
													</div>
													{lastProposalCreatedAt ? (
														<div className='flex items-center justify-between gap-2 text-xs text-base-content/70'>
															<span>Đề xuất tạo lúc</span>
															<span>{formatDateTime(lastProposalCreatedAt)}</span>
														</div>
													) : null}
													{lastProposalRespondedAt ? (
														<div className='flex items-center justify-between gap-2 text-xs text-base-content/70'>
															<span>Phản hồi lúc</span>
															<span>{formatDateTime(lastProposalRespondedAt)}</span>
														</div>
													) : null}
													{lastAdminJoinedAt ? (
														<div className='flex items-center justify-between gap-2 text-xs text-base-content/70'>
															<span>Admin tham gia</span>
															<span>{formatDateTime(lastAdminJoinedAt)}</span>
														</div>
													) : null}
													<div className='flex items-center justify-between gap-2 text-xs text-base-content/70'>
														<span>Admin phụ trách</span>
														<span className='font-medium text-base-content'>{adminLabel}</span>
													</div>
												</div>
											</div>
										</div>

										{latestProposal?.message ? (
											<div className='rounded-xl border border-base-200 bg-base-200/50 p-3 text-sm text-base-content/80'>
												<div className='font-medium text-base-content'>Nội dung đề xuất mới nhất</div>
												<p className='mt-1 whitespace-pre-line'>{latestProposal.message}</p>
											</div>
										) : null}
									</article>
								)
							})}
						</div>
					) : null}
				</div>

				<div className='border-t border-base-200 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
					<div className='text-sm text-base-content/70'>
						Hiển thị {disputes.length ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, total)} trong tổng số{' '}
						{total} tranh chấp
					</div>
					<div className='flex flex-wrap items-center gap-3'>
						<label className='flex items-center gap-2 text-sm'>
							<span>Hiển thị</span>
							<select
								className='select select-bordered select-sm'
								value={limit}
								onChange={event => {
									setLimit(Number(event.target.value))
									setPage(1)
								}}>
								{limitOptions.map(option => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
							<span>dòng</span>
						</label>
						<div className='join'>
							<button
								type='button'
								className='btn btn-sm join-item'
								onClick={() => setPage(page - 1)}
								disabled={page <= 1}>
								«
							</button>
							<button type='button' className='btn btn-sm join-item btn-ghost'>
								Trang {page}/{pages}
							</button>
							<button
								type='button'
								className='btn btn-sm join-item'
								onClick={() => setPage(page + 1)}
								disabled={page >= pages}>
								»
							</button>
						</div>
					</div>
				</div>
			</section>

			{joinTarget ? (
				<div className='modal modal-open'>
					<div className='modal-box space-y-4'>
						<h3 className='flex items-center gap-2 text-lg font-semibold'>
							<ShieldCheck className='size-5 text-primary' /> Tham gia tranh chấp #{joinTarget.id}
						</h3>
						<p className='text-sm text-base-content/70'>
							Bạn có thể để lại ghi chú cho các bên trước khi tham gia phòng tranh chấp.
						</p>
						<textarea
							className='textarea textarea-bordered w-full'
							rows={4}
							placeholder='Ghi chú cho các bên (tuỳ chọn)'
							value={joinReason}
							onChange={event => setJoinReason(event.target.value)}
						/>
						<div className='modal-action'>
							<button className='btn btn-ghost' onClick={() => setJoinTarget(null)} disabled={joinMutation.isPending}>
								Huỷ
							</button>
							<button className='btn btn-primary' onClick={handleJoin} disabled={joinMutation.isPending}>
								{joinMutation.isPending ? 'Đang xử lý...' : 'Tham gia tranh chấp'}
							</button>
						</div>
					</div>
					<div className='modal-backdrop' onClick={() => !joinMutation.isPending && setJoinTarget(null)}>
						Đóng
					</div>
				</div>
			) : null}
		</div>
	)
}
