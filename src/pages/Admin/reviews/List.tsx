import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
	Star,
	Search,
	Filter,
	ChevronDown,
	RefreshCcw,
	Undo2,
	CalendarClock,
	User,
	Briefcase,
	MessageSquare,
	X,
	TrendingUp,
	Users,
	ThumbsUp
} from 'lucide-react'

import { getAdminReviews, getAdminReviewDetail, getAdminReviewStats } from '~/apis/admin/review.api'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { AdminReviewListItem, AdminReviewDetail, AdminReviewListFilters } from '~/types/admin-review'

const formatDateTime = (value?: string | null) => {
	if (!value) return '—'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('vi-VN', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	})
}

const formatUserName = (
	profile?: { firstName?: string | null; lastName?: string | null } | null,
	fallback?: string | null
) => {
	if (!profile) return fallback || '—'
	const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim()
	return name || fallback || '—'
}

const RatingStars = ({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
	const sizeClass = size === 'sm' ? 'size-3' : size === 'lg' ? 'size-6' : 'size-4'
	return (
		<div className='flex items-center gap-0.5'>
			{[1, 2, 3, 4, 5].map(star => (
				<Star
					key={star}
					className={`${sizeClass} ${star <= rating ? 'fill-warning text-warning' : 'text-base-300'}`}
				/>
			))}
		</div>
	)
}

const roleConfig = {
	CLIENT: { label: 'Khách hàng', class: 'badge-primary', icon: User },
	FREELANCER: { label: 'Freelancer', class: 'badge-secondary', icon: Briefcase }
}

export default function AdminReviewListPage() {
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(10)
	const [search, setSearch] = useState('')
	const debouncedSearch = useDebounce(search, 500)
	const [reviewerRole, setReviewerRole] = useState<'CLIENT' | 'FREELANCER' | ''>('')
	const [minRating, setMinRating] = useState<number | ''>('')
	const [maxRating, setMaxRating] = useState<number | ''>('')
	const [reviewerId, setReviewerId] = useState('')
	const [revieweeId, setRevieweeId] = useState('')
	const [contractId, setContractId] = useState('')
	const [createdFrom, setCreatedFrom] = useState('')
	const [createdTo, setCreatedTo] = useState('')
	const [filtersOpen, setFiltersOpen] = useState(false)
	const [sortBy, setSortBy] = useState<AdminReviewListFilters['sortBy']>('createdAt')
	const [sortOrder, setSortOrder] = useState<AdminReviewListFilters['sortOrder']>('desc')

	const [detailTarget, setDetailTarget] = useState<AdminReviewListItem | null>(null)

	const dateRangeError = useMemo(() => {
		if (!createdFrom || !createdTo) return false
		return new Date(createdFrom) > new Date(createdTo)
	}, [createdFrom, createdTo])

	const filters = useMemo(
		() => ({
			page,
			limit,
			search: debouncedSearch || undefined,
			reviewerRole: reviewerRole || undefined,
			minRating: minRating !== '' ? minRating : undefined,
			maxRating: maxRating !== '' ? maxRating : undefined,
			reviewerId: reviewerId.trim() || undefined,
			revieweeId: revieweeId.trim() || undefined,
			contractId: contractId.trim() || undefined,
			createdFrom: createdFrom || undefined,
			createdTo: createdTo || undefined,
			sortBy,
			sortOrder
		}),
		[page, limit, debouncedSearch, reviewerRole, minRating, maxRating, reviewerId, revieweeId, contractId, createdFrom, createdTo, sortBy, sortOrder]
	)

	const { data, isLoading, isFetching, isError, refetch } = useQuery({
		queryKey: ['admin-reviews', filters],
		queryFn: () => getAdminReviews(filters),
		enabled: !dateRangeError
	})

	const { data: statsData } = useQuery({
		queryKey: ['admin-review-stats'],
		queryFn: getAdminReviewStats
	})

	const { data: detailData, isLoading: isDetailLoading } = useQuery({
		queryKey: ['admin-review-detail', detailTarget?.id],
		queryFn: () => getAdminReviewDetail(detailTarget!.id),
		enabled: Boolean(detailTarget?.id)
	})

	const reviews = data?.data ?? []
	const total = data?.total ?? 0
	const totalPages = data?.totalPages ?? 1

	const resetFilters = () => {
		setReviewerRole('')
		setMinRating('')
		setMaxRating('')
		setReviewerId('')
		setRevieweeId('')
		setContractId('')
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
						<Star className='size-6 text-warning' /> Quản lý đánh giá
					</h1>
					<p className='text-sm text-base-content/70'>Xem và quản lý tất cả đánh giá từ Client và Freelancer.</p>
				</div>
				<div className='flex flex-wrap items-center gap-2'>
					<div className='form-control w-full sm:w-72'>
						<label className='input input-bordered flex items-center gap-2'>
							<Search className='size-4 opacity-70' />
							<input
								type='search'
								className='grow bg-transparent outline-none'
								placeholder='Tìm kiếm trong nhận xét...'
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
						<div className='stat-figure text-warning'>
							<Star className='size-8' />
						</div>
						<div className='stat-title'>Tổng đánh giá</div>
						<div className='stat-value text-warning'>{statsData.totalReviews}</div>
						<div className='stat-desc'>30 ngày gần đây: {statsData.recentReviews}</div>
					</div>
					<div className='stat bg-base-100 rounded-box shadow-sm border border-base-200'>
						<div className='stat-figure text-primary'>
							<TrendingUp className='size-8' />
						</div>
						<div className='stat-title'>Điểm trung bình</div>
						<div className='stat-value text-primary'>{statsData.averageRating}</div>
						<div className='stat-desc flex items-center gap-1'>
							<RatingStars rating={Math.round(statsData.averageRating)} size='sm' />
						</div>
					</div>
					<div className='stat bg-base-100 rounded-box shadow-sm border border-base-200'>
						<div className='stat-figure text-success'>
							<ThumbsUp className='size-8' />
						</div>
						<div className='stat-title'>Tỷ lệ tích cực</div>
						<div className='stat-value text-success'>{statsData.positiveRate}%</div>
						<div className='stat-desc'>Đánh giá ≥ 4 sao</div>
					</div>
					<div className='stat bg-base-100 rounded-box shadow-sm border border-base-200'>
						<div className='stat-figure text-info'>
							<Users className='size-8' />
						</div>
						<div className='stat-title'>Theo vai trò</div>
						<div className='stat-value text-info text-lg'>
							<span className='text-primary'>{statsData.clientReviews}</span>
							<span className='text-base-content/50 mx-1'>/</span>
							<span className='text-secondary'>{statsData.freelancerReviews}</span>
						</div>
						<div className='stat-desc'>Client / Freelancer</div>
					</div>
				</div>
			)}

			{/* Rating Distribution */}
			{statsData && (
				<div className='card bg-base-100 shadow-sm border border-base-200'>
					<div className='card-body'>
						<h3 className='card-title text-base'>Phân bố đánh giá</h3>
						<div className='grid gap-2'>
							{[5, 4, 3, 2, 1].map(star => {
								const count = statsData.ratingDistribution[star as keyof typeof statsData.ratingDistribution]
								const percentage = statsData.totalReviews > 0 ? (count / statsData.totalReviews) * 100 : 0
								return (
									<div key={star} className='flex items-center gap-3'>
										<div className='flex items-center gap-1 w-16'>
											<span className='text-sm font-medium'>{star}</span>
											<Star className='size-4 fill-warning text-warning' />
										</div>
										<div className='flex-1'>
											<progress
												className='progress progress-warning w-full'
												value={percentage}
												max={100}
											/>
										</div>
										<div className='w-20 text-right text-sm text-base-content/70'>
											{count} ({percentage.toFixed(1)}%)
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>
			)}


			{/* Filters Panel */}
			{filtersOpen && (
				<section className='card border border-base-200 bg-base-100 shadow-sm'>
					<div className='card-body space-y-4'>
						<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Vai trò người đánh giá</span>
								<select
									className='select select-bordered'
									value={reviewerRole}
									onChange={e => {
										setReviewerRole(e.target.value as 'CLIENT' | 'FREELANCER' | '')
										setPage(1)
									}}>
									<option value=''>Tất cả</option>
									<option value='CLIENT'>Khách hàng</option>
									<option value='FREELANCER'>Freelancer</option>
								</select>
							</label>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Điểm tối thiểu</span>
								<select
									className='select select-bordered'
									value={minRating}
									onChange={e => {
										setMinRating(e.target.value ? Number(e.target.value) : '')
										setPage(1)
									}}>
									<option value=''>Tất cả</option>
									{[1, 2, 3, 4, 5].map(r => (
										<option key={r} value={r}>{r} sao</option>
									))}
								</select>
							</label>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Điểm tối đa</span>
								<select
									className='select select-bordered'
									value={maxRating}
									onChange={e => {
										setMaxRating(e.target.value ? Number(e.target.value) : '')
										setPage(1)
									}}>
									<option value=''>Tất cả</option>
									{[1, 2, 3, 4, 5].map(r => (
										<option key={r} value={r}>{r} sao</option>
									))}
								</select>
							</label>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>ID Hợp đồng</span>
								<input
									className='input input-bordered'
									placeholder='Contract ID'
									value={contractId}
									onChange={e => {
										setContractId(e.target.value)
										setPage(1)
									}}
								/>
							</label>
						</div>

						<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>ID Người đánh giá</span>
								<input
									className='input input-bordered'
									placeholder='Reviewer ID'
									value={reviewerId}
									onChange={e => {
										setReviewerId(e.target.value)
										setPage(1)
									}}
								/>
							</label>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>ID Người được đánh giá</span>
								<input
									className='input input-bordered'
									placeholder='Reviewee ID'
									value={revieweeId}
									onChange={e => {
										setRevieweeId(e.target.value)
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
									onChange={e => setSortBy(e.target.value as AdminReviewListFilters['sortBy'])}>
									<option value='createdAt'>Ngày tạo</option>
									<option value='rating'>Điểm đánh giá</option>
									<option value='updatedAt'>Ngày cập nhật</option>
								</select>
							</label>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Thứ tự</span>
								<select
									className='select select-bordered'
									value={sortOrder}
									onChange={e => setSortOrder(e.target.value as AdminReviewListFilters['sortOrder'])}>
									<option value='desc'>Mới nhất</option>
									<option value='asc'>Cũ nhất</option>
								</select>
							</label>
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

			{/* Review List */}
			<section className='card bg-base-100 shadow-sm'>
				<div className='card-body space-y-4'>
					{isLoading ? (
						<div className='space-y-4'>
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className='skeleton h-28 w-full rounded-lg' />
							))}
						</div>
					) : isError ? (
						<div className='alert alert-error'>
							<X className='size-5' />
							<span>Không thể tải danh sách đánh giá. Vui lòng thử lại.</span>
						</div>
					) : reviews.length === 0 ? (
						<div className='py-12 text-center text-base-content/70'>
							<Star className='size-12 mx-auto mb-4 opacity-50' />
							<p>Không tìm thấy đánh giá nào.</p>
						</div>
					) : (
						<div className='space-y-4'>
							{reviews.map(review => {
								const config = roleConfig[review.role] || { label: review.role, class: 'badge-ghost', icon: User }
								const RoleIcon = config.icon
								return (
									<article
										key={review.id}
										className='rounded-xl border border-base-200 p-4 hover:border-primary/30 transition-colors'>
										<div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
											<div className='space-y-3 flex-1'>
												<div className='flex flex-wrap items-center gap-3'>
													<RatingStars rating={review.rating} />
													<span className={`badge gap-1 ${config.class}`}>
														<RoleIcon className='size-3' />
														{config.label}
													</span>
													{review.wouldHireAgain !== null && (
														<span className={`badge badge-sm ${review.wouldHireAgain ? 'badge-success' : 'badge-error'}`}>
															{review.wouldHireAgain ? 'Sẽ thuê lại' : 'Không thuê lại'}
														</span>
													)}
												</div>
												<div className='flex flex-wrap gap-4 text-sm text-base-content/70'>
													<span className='flex items-center gap-1'>
														<User className='size-4' />
														Từ: {formatUserName(review.reviewer?.profile, review.reviewer?.email)}
													</span>
													<span className='flex items-center gap-1'>
														<Briefcase className='size-4' />
														Cho: {formatUserName(review.reviewee?.profile, review.reviewee?.email)}
													</span>
												</div>
												{review.comment && (
													<div className='flex items-start gap-2 text-sm'>
														<MessageSquare className='size-4 mt-0.5 text-base-content/50' />
														<p className='line-clamp-2'>{review.comment}</p>
													</div>
												)}
												<div className='text-xs text-base-content/60'>
													Hợp đồng: {review.contract?.title || review.contractId.slice(-8)} • {formatDateTime(review.createdAt)}
												</div>
											</div>
											<div className='flex items-center gap-2'>
												<button
													type='button'
													className='btn btn-sm btn-primary'
													onClick={() => setDetailTarget(review)}>
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
					{!isLoading && !isError && reviews.length > 0 && (
						<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t border-base-200 pt-4'>
							<div className='text-sm text-base-content/70'>
								Hiển thị {(page - 1) * limit + 1}-{Math.min(page * limit, total)} trong tổng số {total} đánh giá
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
					<div className='modal-box max-w-2xl'>
						<div className='flex items-start justify-between mb-4'>
							<div>
								<h3 className='text-lg font-semibold'>Chi tiết đánh giá</h3>
								<p className='text-sm text-base-content/70'>ID: {detailTarget.id.slice(-12)}</p>
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
							<ReviewDetailContent review={detailData} />
						) : null}

						<div className='modal-action'>
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

function ReviewDetailContent({ review }: { review: AdminReviewDetail }) {
	const config = roleConfig[review.role] || { label: review.role, class: 'badge-ghost', icon: User }
	const RoleIcon = config.icon

	return (
		<div className='space-y-6'>
			{/* Rating & Role */}
			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<RatingStars rating={review.rating} size='lg' />
					<span className='text-2xl font-bold'>{review.rating}/5</span>
				</div>
				<span className={`badge gap-1 ${config.class}`}>
					<RoleIcon className='size-3' />
					{config.label}
				</span>
				{review.wouldHireAgain !== null && (
					<span className={`badge ${review.wouldHireAgain ? 'badge-success' : 'badge-error'}`}>
						{review.wouldHireAgain ? 'Sẽ thuê lại' : 'Không thuê lại'}
					</span>
				)}
			</div>

			{/* Comment */}
			{review.comment && (
				<div className='rounded-lg border border-base-200 p-4'>
					<div className='text-sm font-medium text-base-content/60 mb-2'>Nhận xét</div>
					<p className='whitespace-pre-wrap'>{review.comment}</p>
				</div>
			)}

			{/* Reviewer & Reviewee */}
			<div className='grid gap-4 sm:grid-cols-2'>
				<div className='rounded-lg border border-base-200 p-4'>
					<div className='text-sm font-medium text-base-content/60 mb-2'>Người đánh giá</div>
					<div className='font-semibold'>
						{formatUserName(review.reviewer?.profile, review.reviewer?.email)}
					</div>
					<div className='text-xs text-base-content/60'>
						{review.reviewer?.email}
					</div>
					<div className='text-xs text-base-content/60'>ID: {review.reviewerId}</div>
				</div>
				<div className='rounded-lg border border-base-200 p-4'>
					<div className='text-sm font-medium text-base-content/60 mb-2'>Người được đánh giá</div>
					<div className='font-semibold'>
						{formatUserName(review.reviewee?.profile, review.reviewee?.email)}
					</div>
					<div className='text-xs text-base-content/60'>
						{review.reviewee?.email}
					</div>
					<div className='text-xs text-base-content/60'>ID: {review.revieweeId}</div>
				</div>
			</div>

			{/* Contract Info */}
			{review.contract && (
				<div className='rounded-lg border border-base-200 p-4'>
					<div className='text-sm font-medium text-base-content/60 mb-2'>Thông tin hợp đồng</div>
					<div className='space-y-2'>
						<div className='font-semibold'>{review.contract.title}</div>
						<div className='flex flex-wrap gap-4 text-sm text-base-content/70'>
							<span>Trạng thái: {review.contract.status}</span>
							{review.contract.createdAt && (
								<span>Tạo: {formatDateTime(review.contract.createdAt)}</span>
							)}
							{review.contract.endedAt && (
								<span>Kết thúc: {formatDateTime(review.contract.endedAt)}</span>
							)}
						</div>
						{review.contract.client && (
							<div className='text-sm'>
								Client: {formatUserName(review.contract.client.profile, review.contract.client.companyName)}
							</div>
						)}
						{review.contract.freelancer && (
							<div className='text-sm'>
								Freelancer: {formatUserName(review.contract.freelancer.profile, review.contract.freelancer.title)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Timestamps */}
			<div className='flex flex-wrap gap-4 text-sm text-base-content/60'>
				<span>Tạo: {formatDateTime(review.createdAt)}</span>
				<span>Cập nhật: {formatDateTime(review.updatedAt)}</span>
			</div>
		</div>
	)
}
