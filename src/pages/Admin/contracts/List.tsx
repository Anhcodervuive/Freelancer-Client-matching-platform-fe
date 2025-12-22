import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
	FileText,
	Search,
	Filter,
	ChevronDown,
	RefreshCcw,
	Undo2,
	CalendarClock,
	User,
	Briefcase,
	DollarSign,
	Clock,
	CheckCircle,
	XCircle,
	PauseCircle,
	AlertCircle,
	X,
	TrendingUp
} from 'lucide-react'

import { getAdminContracts, getAdminContractDetail, getAdminContractStats } from '~/apis/admin/contract.api'
import { routes } from '~/config/routes'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { AdminContractListItem, AdminContractDetail, AdminContractListFilters } from '~/types/admin-contract'
import { AdminContractStatus } from '~/types/admin-contract'

const STATUS_OPTIONS = Object.values(AdminContractStatus)

const statusConfig: Record<string, { label: string; class: string; icon: typeof CheckCircle }> = {
	DRAFT: { label: 'Bản nháp', class: 'badge-ghost', icon: FileText },
	ACTIVE: { label: 'Đang hoạt động', class: 'badge-success', icon: CheckCircle },
	PAUSED: { label: 'Tạm dừng', class: 'badge-warning', icon: PauseCircle },
	COMPLETED: { label: 'Hoàn thành', class: 'badge-info', icon: CheckCircle },
	CANCELLED: { label: 'Đã hủy', class: 'badge-error', icon: XCircle }
}

const formatDateTime = (value?: string | null) => {
	if (!value) return '—'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('vi-VN', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	})
}

const formatCurrency = (amount?: number | null, currency?: string | null) => {
	if (amount === null || amount === undefined) return '—'
	const curr = currency || 'USD'
	try {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: curr,
			maximumFractionDigits: 0
		}).format(amount)
	} catch {
		return `${amount.toLocaleString()} ${curr}`
	}
}

const formatUserName = (
	profile?: { firstName?: string | null; lastName?: string | null } | null,
	fallback?: string | null
) => {
	if (!profile) return fallback || '—'
	const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim()
	return name || fallback || '—'
}

export default function AdminContractListPage() {
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(10)
	const [search, setSearch] = useState('')
	const debouncedSearch = useDebounce(search, 500)
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
	const [clientId, setClientId] = useState('')
	const [freelancerId, setFreelancerId] = useState('')
	const [createdFrom, setCreatedFrom] = useState('')
	const [createdTo, setCreatedTo] = useState('')
	const [filtersOpen, setFiltersOpen] = useState(false)
	const [sortBy, setSortBy] = useState<AdminContractListFilters['sortBy']>('createdAt')
	const [sortOrder, setSortOrder] = useState<AdminContractListFilters['sortOrder']>('desc')

	const [detailTarget, setDetailTarget] = useState<AdminContractListItem | null>(null)

	const dateRangeError = useMemo(() => {
		if (!createdFrom || !createdTo) return false
		return new Date(createdFrom) > new Date(createdTo)
	}, [createdFrom, createdTo])

	const filters = useMemo(
		() => ({
			page,
			limit,
			search: debouncedSearch || undefined,
			status: selectedStatuses.length ? selectedStatuses.join(',') : undefined,
			clientId: clientId.trim() || undefined,
			freelancerId: freelancerId.trim() || undefined,
			createdFrom: createdFrom || undefined,
			createdTo: createdTo || undefined,
			sortBy,
			sortOrder
		}),
		[page, limit, debouncedSearch, selectedStatuses, clientId, freelancerId, createdFrom, createdTo, sortBy, sortOrder]
	)

	const { data, isLoading, isFetching, isError, refetch } = useQuery({
		queryKey: ['admin-contracts', filters],
		queryFn: () => getAdminContracts(filters),
		enabled: !dateRangeError
	})

	const { data: statsData } = useQuery({
		queryKey: ['admin-contract-stats'],
		queryFn: getAdminContractStats
	})

	const { data: detailData, isLoading: isDetailLoading } = useQuery({
		queryKey: ['admin-contract-detail', detailTarget?.id],
		queryFn: () => getAdminContractDetail(detailTarget!.id),
		enabled: Boolean(detailTarget?.id)
	})

	const contracts = data?.data ?? []
	const total = data?.total ?? 0
	const totalPages = data?.totalPages ?? 1

	const toggleStatus = (status: string) => {
		setSelectedStatuses(prev => {
			if (prev.includes(status)) {
				return prev.filter(s => s !== status)
			}
			return [...prev, status]
		})
		setPage(1)
	}

	const resetFilters = () => {
		setSelectedStatuses([])
		setClientId('')
		setFreelancerId('')
		setCreatedFrom('')
		setCreatedTo('')
		setSearch('')
		setSortBy('createdAt')
		setSortOrder('desc')
		setPage(1)
	}

	const limitOptions = [10, 20, 50]

	return (
		<div className='space-y-6'>
			{/* Header */}
			<header className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
				<div className='space-y-1'>
					<h1 className='flex items-center gap-2 text-2xl font-semibold'>
						<FileText className='size-6 text-primary' /> Quản lý hợp đồng
					</h1>
					<p className='text-sm text-base-content/70'>Theo dõi và quản lý tất cả hợp đồng trên nền tảng.</p>
				</div>
				<div className='flex flex-wrap items-center gap-2'>
					<div className='form-control w-full sm:w-72'>
						<label className='input input-bordered flex items-center gap-2'>
							<Search className='size-4 opacity-70' />
							<input
								type='search'
								className='grow bg-transparent outline-none'
								placeholder='Tìm kiếm hợp đồng...'
								value={search}
								onChange={e => {
									setSearch(e.target.value)
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
						<ChevronDown className={`size-4 transition ${filtersOpen ? 'rotate-180' : ''}`} />
					</button>
					<button type='button' className='btn btn-ghost' onClick={resetFilters} disabled={isFetching}>
						<Undo2 className='size-4' /> Đặt lại
					</button>
					<button type='button' className='btn' onClick={() => refetch()} disabled={isFetching}>
						<RefreshCcw className='size-4' /> Làm mới
					</button>
				</div>
			</header>

			{/* Stats Cards */}
			{statsData && (
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
					<div className='stat bg-base-100 rounded-box shadow-sm border border-base-200'>
						<div className='stat-figure text-primary'>
							<FileText className='size-8' />
						</div>
						<div className='stat-title'>Tổng hợp đồng</div>
						<div className='stat-value text-primary'>{statsData.totalContracts}</div>
					</div>
					<div className='stat bg-base-100 rounded-box shadow-sm border border-base-200'>
						<div className='stat-figure text-success'>
							<CheckCircle className='size-8' />
						</div>
						<div className='stat-title'>Đang hoạt động</div>
						<div className='stat-value text-success'>{statsData.activeContracts}</div>
					</div>
					<div className='stat bg-base-100 rounded-box shadow-sm border border-base-200'>
						<div className='stat-figure text-info'>
							<TrendingUp className='size-8' />
						</div>
						<div className='stat-title'>Hoàn thành</div>
						<div className='stat-value text-info'>{statsData.completedContracts}</div>
					</div>
					<div className='stat bg-base-100 rounded-box shadow-sm border border-base-200'>
						<div className='stat-figure text-warning'>
							<DollarSign className='size-8' />
						</div>
						<div className='stat-title'>Tổng giá trị</div>
						<div className='stat-value text-warning text-2xl'>{formatCurrency(statsData.totalValue, 'USD')}</div>
					</div>
				</div>
			)}

			{/* Filters Panel */}
			{filtersOpen && (
				<section className='card border border-base-200 bg-base-100 shadow-sm'>
					<div className='card-body space-y-4'>
						<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>ID Khách hàng</span>
								<input
									className='input input-bordered'
									placeholder='Client ID'
									value={clientId}
									onChange={e => {
										setClientId(e.target.value)
										setPage(1)
									}}
								/>
							</label>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>ID Freelancer</span>
								<input
									className='input input-bordered'
									placeholder='Freelancer ID'
									value={freelancerId}
									onChange={e => {
										setFreelancerId(e.target.value)
										setPage(1)
									}}
								/>
							</label>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Từ ngày</span>
								<input
									type='date'
									className='input input-bordered'
									value={createdFrom}
									onChange={e => {
										setCreatedFrom(e.target.value)
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
									onChange={e => {
										setCreatedTo(e.target.value)
										setPage(1)
									}}
								/>
							</label>
						</div>

						<div className='grid gap-4 md:grid-cols-2'>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Sắp xếp theo</span>
								<select
									className='select select-bordered'
									value={sortBy}
									onChange={e => setSortBy(e.target.value as AdminContractListFilters['sortBy'])}>
									<option value='createdAt'>Ngày tạo</option>
									<option value='updatedAt'>Ngày cập nhật</option>
									<option value='totalPaidAmount'>Giá trị</option>
									<option value='title'>Tiêu đề</option>
								</select>
							</label>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Thứ tự</span>
								<select
									className='select select-bordered'
									value={sortOrder}
									onChange={e => setSortOrder(e.target.value as AdminContractListFilters['sortOrder'])}>
									<option value='desc'>Mới nhất</option>
									<option value='asc'>Cũ nhất</option>
								</select>
							</label>
						</div>

						<div>
							<span className='label-text text-sm font-medium'>Trạng thái</span>
							<div className='mt-2 flex flex-wrap gap-2'>
								{STATUS_OPTIONS.map(status => {
									const config = statusConfig[status] || { label: status, class: 'badge-ghost' }
									const checked = selectedStatuses.includes(status)
									return (
										<label
											key={status}
											className={`badge cursor-pointer gap-2 ${config.class} ${checked ? 'badge-outline' : ''}`}>
											<input
												type='checkbox'
												className='checkbox checkbox-xs'
												checked={checked}
												onChange={() => toggleStatus(status)}
											/>
											{config.label}
										</label>
									)
								})}
							</div>
						</div>

						{dateRangeError && (
							<div className='alert alert-warning shadow-sm'>
								<CalendarClock className='size-5' />
								<span>Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.</span>
							</div>
						)}
					</div>
				</section>
			)}

			{/* Contract List */}
			<section className='card bg-base-100 shadow-sm'>
				<div className='card-body space-y-4'>
					{isLoading ? (
						<div className='space-y-4'>
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className='skeleton h-32 w-full rounded-lg' />
							))}
						</div>
					) : isError ? (
						<div className='alert alert-error'>
							<AlertCircle className='size-5' />
							<span>Không thể tải danh sách hợp đồng. Vui lòng thử lại.</span>
						</div>
					) : contracts.length === 0 ? (
						<div className='py-12 text-center text-base-content/70'>
							<FileText className='size-12 mx-auto mb-4 opacity-50' />
							<p>Không tìm thấy hợp đồng nào.</p>
						</div>
					) : (
						<div className='space-y-4'>
							{contracts.map(contract => {
								const config = statusConfig[contract.status || ''] || { label: contract.status, class: 'badge-ghost', icon: FileText }
								const StatusIcon = config.icon
								return (
									<article
										key={contract.id}
										className='rounded-xl border border-base-200 p-4 hover:border-primary/30 transition-colors'>
										<div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
											<div className='space-y-2 flex-1'>
												<div className='flex flex-wrap items-center gap-2'>
													<span className='font-semibold text-base-content'>
														{contract.title || contract.code || `Hợp đồng #${contract.id.slice(-8)}`}
													</span>
													<span className={`badge gap-1 ${config.class}`}>
														<StatusIcon className='size-3' />
														{config.label}
													</span>
												</div>
												<div className='flex flex-wrap gap-4 text-sm text-base-content/70'>
													<span className='flex items-center gap-1'>
														<User className='size-4' />
														KH: {formatUserName(contract.client?.profile, contract.client?.companyName)}
													</span>
													<span className='flex items-center gap-1'>
														<Briefcase className='size-4' />
														FL: {formatUserName(contract.freelancer?.profile, contract.freelancer?.title)}
													</span>
													<span className='flex items-center gap-1'>
														<DollarSign className='size-4' />
														{formatCurrency(
															contract.jobPost?.budgetAmount ? Number(contract.jobPost.budgetAmount) : null,
															contract.jobPost?.budgetCurrency
														)}
													</span>
													<span className='flex items-center gap-1'>
														<Clock className='size-4' />
														{formatDateTime(contract.createdAt)}
													</span>
												</div>
												{contract.jobPost && (
													<div className='text-xs text-base-content/60'>
														Công việc: {contract.jobPost.title}
													</div>
												)}
											</div>
											<div className='flex items-center gap-2'>
												<span className='badge badge-outline'>
													{contract._count?.milestones || 0} milestones
												</span>
												<button
													type='button'
													className='btn btn-sm btn-primary'
													onClick={() => setDetailTarget(contract)}>
													Xem chi tiết
												</button>
											</div>
										</div>
									</article>
								)
							})}
						</div>
					)}

					{/* Pagination */}
					{!isLoading && !isError && contracts.length > 0 && (
						<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t border-base-200 pt-4'>
							<div className='text-sm text-base-content/70'>
								Hiển thị {(page - 1) * limit + 1}-{Math.min(page * limit, total)} trong tổng số {total} hợp đồng
							</div>
							<div className='flex flex-wrap items-center gap-3'>
								<label className='flex items-center gap-2 text-sm'>
									<span>Hiển thị</span>
									<select
										className='select select-bordered select-sm'
										value={limit}
										onChange={e => {
											setLimit(Number(e.target.value))
											setPage(1)
										}}>
										{limitOptions.map(opt => (
											<option key={opt} value={opt}>
												{opt}
											</option>
										))}
									</select>
									<span>dòng</span>
								</label>
								<div className='join'>
									<button
										type='button'
										className='btn btn-sm join-item'
										onClick={() => setPage(p => p - 1)}
										disabled={page <= 1}>
										«
									</button>
									<button type='button' className='btn btn-sm join-item btn-ghost'>
										Trang {page}/{totalPages}
									</button>
									<button
										type='button'
										className='btn btn-sm join-item'
										onClick={() => setPage(p => p + 1)}
										disabled={page >= totalPages}>
										»
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</section>

			{/* Detail Modal */}
			{detailTarget && (
				<dialog className='modal modal-open'>
					<div className='modal-box max-w-4xl'>
						<div className='flex items-start justify-between mb-4'>
							<div>
								<h3 className='text-lg font-semibold'>
									Chi tiết hợp đồng
								</h3>
								<p className='text-sm text-base-content/70'>
									{detailTarget.title || detailTarget.code || `#${detailTarget.id.slice(-8)}`}
								</p>
							</div>
							<button
								type='button'
								className='btn btn-sm btn-ghost btn-circle'
								onClick={() => setDetailTarget(null)}>
								<X className='size-5' />
							</button>
						</div>

						{isDetailLoading ? (
							<div className='space-y-4'>
								<div className='skeleton h-20 w-full' />
								<div className='skeleton h-40 w-full' />
							</div>
						) : detailData ? (
							<ContractDetailContent contract={detailData} />
						) : null}

						<div className='modal-action'>
							<Link
								to={routes.contracts.detail(detailTarget.id)}
								className='btn btn-primary'
								target='_blank'>
								Mở trang chi tiết
							</Link>
							<button type='button' className='btn' onClick={() => setDetailTarget(null)}>
								Đóng
							</button>
						</div>
					</div>
					<form method='dialog' className='modal-backdrop'>
						<button type='button' onClick={() => setDetailTarget(null)}>
							close
						</button>
					</form>
				</dialog>
			)}
		</div>
	)
}

function ContractDetailContent({ contract }: { contract: AdminContractDetail }) {
	const config = statusConfig[contract.status || ''] || { label: contract.status, class: 'badge-ghost', icon: FileText }
	const StatusIcon = config.icon

	return (
		<div className='space-y-6'>
			{/* Status & Basic Info */}
			<div className='grid gap-4 sm:grid-cols-2'>
				<div className='space-y-2'>
					<div className='text-sm text-base-content/60'>Trạng thái</div>
					<span className={`badge gap-1 ${config.class}`}>
						<StatusIcon className='size-3' />
						{config.label}
					</span>
				</div>
				<div className='space-y-2'>
					<div className='text-sm text-base-content/60'>Loại thanh toán</div>
					<div className='font-medium'>
						{contract.paymentMode === 'FIXED' ? 'Giá cố định' : contract.paymentMode === 'HOURLY' ? 'Theo giờ' : contract.paymentMode || '—'}
					</div>
				</div>
				<div className='space-y-2'>
					<div className='text-sm text-base-content/60'>Ngày tạo</div>
					<div className='font-medium'>{formatDateTime(contract.createdAt)}</div>
				</div>
				<div className='space-y-2'>
					<div className='text-sm text-base-content/60'>Ngày cập nhật</div>
					<div className='font-medium'>{formatDateTime(contract.updatedAt)}</div>
				</div>
			</div>

			{/* Parties */}
			<div className='grid gap-4 sm:grid-cols-2'>
				<div className='rounded-lg border border-base-200 p-4'>
					<div className='text-sm font-medium text-base-content/60 mb-2'>Khách hàng</div>
					<div className='font-semibold'>
						{formatUserName(contract.client?.profile, contract.client?.companyName)}
					</div>
					<div className='text-xs text-base-content/60'>ID: {contract.clientId}</div>
				</div>
				<div className='rounded-lg border border-base-200 p-4'>
					<div className='text-sm font-medium text-base-content/60 mb-2'>Freelancer</div>
					<div className='font-semibold'>
						{formatUserName(contract.freelancer?.profile, contract.freelancer?.title)}
					</div>
					<div className='text-xs text-base-content/60'>ID: {contract.freelancerId}</div>
				</div>
			</div>

			{/* Financial Stats */}
			{contract.financialStats && (
				<div className='rounded-lg border border-base-200 p-4'>
					<div className='text-sm font-medium mb-3'>Thống kê tài chính</div>
					<div className='grid gap-4 sm:grid-cols-3'>
						<div>
							<div className='text-xs text-base-content/60'>Đã fund</div>
							<div className='font-semibold text-success'>
								{formatCurrency(contract.financialStats.totalFunded, contract.financialStats.currency)}
							</div>
						</div>
						<div>
							<div className='text-xs text-base-content/60'>Đã release</div>
							<div className='font-semibold text-info'>
								{formatCurrency(contract.financialStats.totalReleased, contract.financialStats.currency)}
							</div>
						</div>
						<div>
							<div className='text-xs text-base-content/60'>Đã hoàn</div>
							<div className='font-semibold text-warning'>
								{formatCurrency(contract.financialStats.totalRefunded, contract.financialStats.currency)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Milestone Stats */}
			{contract.milestoneStats && (
				<div className='rounded-lg border border-base-200 p-4'>
					<div className='text-sm font-medium mb-3'>Thống kê Milestones</div>
					<div className='grid gap-2 sm:grid-cols-6'>
						<div className='text-center'>
							<div className='text-2xl font-bold'>{contract.milestoneStats.total}</div>
							<div className='text-xs text-base-content/60'>Tổng</div>
						</div>
						<div className='text-center'>
							<div className='text-2xl font-bold text-success'>{contract.milestoneStats.released}</div>
							<div className='text-xs text-base-content/60'>Đã release</div>
						</div>
						<div className='text-center'>
							<div className='text-2xl font-bold text-info'>{contract.milestoneStats.approved}</div>
							<div className='text-xs text-base-content/60'>Đã duyệt</div>
						</div>
						<div className='text-center'>
							<div className='text-2xl font-bold text-warning'>{contract.milestoneStats.submitted}</div>
							<div className='text-xs text-base-content/60'>Đã nộp</div>
						</div>
						<div className='text-center'>
							<div className='text-2xl font-bold text-base-content/70'>{contract.milestoneStats.open}</div>
							<div className='text-xs text-base-content/60'>Đang mở</div>
						</div>
						<div className='text-center'>
							<div className='text-2xl font-bold text-error'>{contract.milestoneStats.disputed}</div>
							<div className='text-xs text-base-content/60'>Tranh chấp</div>
						</div>
					</div>
				</div>
			)}

			{/* Milestones List */}
			{contract.milestones && contract.milestones.length > 0 && (
				<div>
					<div className='text-sm font-medium mb-3'>Danh sách Milestones</div>
					<div className='space-y-2 max-h-60 overflow-y-auto'>
						{contract.milestones.map(milestone => (
							<div key={milestone.id} className='rounded-lg border border-base-200 p-3 text-sm'>
								<div className='flex items-center justify-between'>
									<span className='font-medium'>{milestone.title}</span>
									<span className='badge badge-sm'>{milestone.status}</span>
								</div>
								<div className='flex gap-4 mt-1 text-xs text-base-content/60'>
									<span>{formatCurrency(milestone.amount, milestone.currency)}</span>
									{milestone.escrow && (
										<span>Escrow: {milestone.escrow.status}</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Feedbacks */}
			{contract.feedbacks && contract.feedbacks.length > 0 && (
				<div>
					<div className='text-sm font-medium mb-3'>Đánh giá</div>
					<div className='space-y-2'>
						{contract.feedbacks.map(feedback => (
							<div key={feedback.id} className='rounded-lg border border-base-200 p-3 text-sm'>
								<div className='flex items-center gap-2'>
									<span className='font-medium'>
										{formatUserName(feedback.reviewer?.profile)}
									</span>
									<span className='badge badge-sm'>{feedback.role}</span>
									<span className='text-warning'>{'★'.repeat(feedback.rating || 0)}</span>
								</div>
								{feedback.comment && (
									<p className='mt-1 text-base-content/70'>{feedback.comment}</p>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
