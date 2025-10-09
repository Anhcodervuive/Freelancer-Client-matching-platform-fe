import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
	ArrowLeft,
	CalendarClock,
	CheckCircle2,
	CreditCard,
	Flag,
	FolderOpen,
	History,
	LayoutDashboard,
	Loader2,
	ShieldCheck,
	Users
} from 'lucide-react'

import { getContractDetail, listContractMilestones } from '~/apis/contract.api'
import { getContractStatusDescription, getContractStatusMeta } from '~/constants/contract'
import { routes } from '~/config/routes'
import { selectCurrentUser } from '~/redux/user/userSlice'
import type { Contract } from '~/types/contract'
import { Role } from '~/types/user'
import { formatCurrency, formatDateTime, formatFileSize } from '~/utils/format'
import {
	extractLanguageLabels,
	extractSkillNames,
	getBudgetDisplay,
	getCurrency,
	getParticipantLocation,
	getParticipantName
} from './utils'

const tabs = [
	{ id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
	{ id: 'milestones', label: 'Milestones', icon: Flag },
	{ id: 'files', label: 'Tệp đính kèm', icon: FolderOpen },
	{ id: 'payments', label: 'Thanh toán', icon: CreditCard },
	{ id: 'history', label: 'Lịch sử', icon: History }
] as const

type ViewerRole = 'client' | 'freelancer' | 'all'

const milestoneStatusMeta: Record<string, { label: string; badge: string; text: string }> = {
	PENDING: { label: 'Chờ bắt đầu', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
	IN_PROGRESS: { label: 'Đang thực hiện', badge: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
	SUBMITTED: { label: 'Đã gửi duyệt', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
	APPROVED: { label: 'Đã duyệt', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
	RELEASED: { label: 'Đã thanh toán', badge: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
	COMPLETED: { label: 'Hoàn thành', badge: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
	CANCELLED: { label: 'Đã hủy', badge: 'bg-rose-50 border-rose-200', text: 'text-rose-700' }
}

const getMilestoneStatusMeta = (status?: string | null) => {
	if (!status) {
		return { label: 'Không xác định', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' }
	}
	const normalized = status.toUpperCase()
	return (
		milestoneStatusMeta[normalized] || {
			label: status
				.toLowerCase()
				.split(/[_\s]+/)
				.map(part => part.charAt(0).toUpperCase() + part.slice(1))
				.join(' '),
			badge: 'bg-slate-100 border-slate-200',
			text: 'text-slate-600'
		}
	)
}

type TabId = (typeof tabs)[number]['id']

type ProcessedAttachment = {
	id: string
	name: string
	url: string | undefined
	size: number | undefined
	mimeType: string | undefined
}

const buildTimeline = (contract?: Contract | null) => {
	if (!contract) return [] as Array<{ id: string; date?: string | null; label: string; description?: string }>

	const events: Array<{ id: string; date?: string | null; label: string; description?: string }> = []

	if (contract.createdAt) events.push({ id: 'created', date: contract.createdAt, label: 'Hợp đồng được tạo' })
	if (contract.proposal?.submittedAt)
		events.push({ id: 'proposal', date: contract.proposal.submittedAt, label: 'Freelancer gửi proposal' })
	if (contract.offer?.createdAt) events.push({ id: 'offer', date: contract.offer.createdAt, label: 'Client gửi offer' })
	if (contract.acceptedAt)
		events.push({ id: 'accepted', date: contract.acceptedAt, label: 'Hai bên chấp nhận điều khoản' })
	if (contract.startDate || contract.offer?.startDate)
		events.push({ id: 'start', date: contract.startDate || contract.offer?.startDate, label: 'Bắt đầu thực hiện' })
	if (contract.endDate || contract.offer?.endDate)
		events.push({ id: 'end', date: contract.endDate || contract.offer?.endDate, label: 'Kết thúc hợp đồng' })
	if (contract.updatedAt) events.push({ id: 'updated', date: contract.updatedAt, label: 'Cập nhật gần nhất' })

	return events.filter(event => Boolean(event.date))
}

const buildAttachmentList = (contract?: Contract | null) => {
	const attachments: (string | Record<string, unknown> | null)[] | undefined = contract?.jobPost?.attachments
	if (!attachments || !Array.isArray(attachments))
		return [] as Array<{
			id: string
			name: string
			url?: string
			size?: number
			mimeType?: string
		}>

	return attachments
		.map((attachment): ProcessedAttachment | null => {
			if (!attachment) return null
			if (typeof attachment === 'string') {
				return {
					id: attachment,
					name: attachment.split('/').pop() || attachment,
					url: attachment,
					size: undefined,
					mimeType: undefined
				}
			}
			const record = attachment as Record<string, unknown>
			const randomId =
				typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
					? crypto.randomUUID()
					: `attachment-${Math.random().toString(36).slice(2, 11)}`
			const id = (record.id as string) || (record.fileName as string) || (record.name as string) || randomId
			const name =
				typeof record.name === 'string' ? record.name : typeof record.fileName === 'string' ? record.fileName : id
			const url =
				typeof record.url === 'string' ? record.url : typeof record.fileUrl === 'string' ? record.fileUrl : undefined
			const size = typeof record.size === 'number' ? record.size : undefined
			const mimeType = typeof record.mimeType === 'string' ? record.mimeType : undefined
			return { id, name, url, size, mimeType }
		})
		.filter((item): item is ProcessedAttachment => Boolean(item))
}

const ContractWorkroomPage = () => {
	const { contractId } = useParams<{ contractId: string }>()
	const navigate = useNavigate()
	const currentUser = useSelector(selectCurrentUser)
	const [activeTab, setActiveTab] = useState<TabId>('overview')

	const viewerRole: ViewerRole =
		currentUser?.role === Role.CLIENT ? 'client' : currentUser?.role === Role.FREELANCER ? 'freelancer' : 'all'

	const contractQuery = useQuery({
		queryKey: ['contract', contractId],
		queryFn: () => {
			if (!contractId) throw new Error('Missing contract id')
			return getContractDetail(contractId)
		},
		enabled: Boolean(contractId)
	})

	const milestoneQuery = useQuery({
		queryKey: ['contract-milestones', contractId],
		queryFn: () => {
			if (!contractId) throw new Error('Missing contract ID')
			return listContractMilestones(contractId as string)
		},
		enabled: Boolean(contractId) && activeTab === 'milestones'
	})

	const contract = contractQuery.data as Contract | undefined
        const statusMeta = getContractStatusMeta(contract?.status as string | undefined)
        const statusDescription = getContractStatusDescription(contract?.status as string | undefined)
	const clientName = getParticipantName(contract?.client?.profile, contract?.client?.companyName)
	const freelancerName = getParticipantName(contract?.freelancer?.profile, undefined)
	const clientLocation = getParticipantLocation(contract?.client?.profile)
	const freelancerLocation = getParticipantLocation(contract?.freelancer?.profile)
	const jobSkills = extractSkillNames(contract ?? ({} as Contract)).slice(0, 10)
	const jobLanguages = extractLanguageLabels(contract ?? ({} as Contract))
	const budgetSummary = contract ? getBudgetDisplay(contract) : undefined
	const currency = contract ? getCurrency(contract) : undefined
	const totalPaid = formatCurrency(contract?.totalPaidAmount ?? undefined, currency)
	const outstanding = formatCurrency(contract?.outstandingBalance ?? undefined, currency)
	const hourlyRate = formatCurrency(contract?.hourlyRate ?? undefined, contract?.hourlyRateCurrency ?? currency)
	const fixedPrice = formatCurrency(contract?.fixedPrice ?? undefined, contract?.fixedPriceCurrency ?? currency)
	const timelineEvents = useMemo(() => buildTimeline(contract), [contract])
	const attachments = useMemo(() => buildAttachmentList(contract), [contract])

	const jobPostLink = contract?.jobPost?.id
		? currentUser?.role === Role.CLIENT
			? routes.me.client.jobs.detail(contract.jobPost.id)
			: routes.freelancer.jobs.detail(contract.jobPost.id)
		: undefined

	const heroBadge =
		viewerRole === 'client' ? 'Workroom khách hàng' : viewerRole === 'freelancer' ? 'Workroom freelancer' : 'Workroom'
	const heroSubtitle =
		viewerRole === 'client'
			? freelancerName
				? `Làm việc với ${freelancerName}`
				: 'Theo dõi hợp đồng với freelancer của bạn'
			: viewerRole === 'freelancer'
			? clientName
				? `Cộng tác cùng ${clientName}`
				: 'Theo dõi hợp đồng với khách hàng của bạn'
			: `${clientName ?? 'Khách hàng'} · ${freelancerName ?? 'Freelancer'}`

	const renderOverview = () => (
		<div className='space-y-8'>
			<div className='grid gap-4 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] md:grid-cols-3 md:p-8'>
				<div className='space-y-3'>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Trạng thái</p>
                                        <div className='space-y-2'>
                                                <span
                                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold shadow-sm shadow-white/40 ${statusMeta.badge} ${statusMeta.text}`}>
                                                        <span className='size-2 rounded-full bg-current'></span>
                                                        {statusMeta.label}
                                                </span>
                                                <p className='flex items-start gap-2 text-sm font-medium text-slate-600'>
                                                        <ShieldCheck className='mt-0.5 size-4 text-primary' />
                                                        <span className='text-left'>{statusDescription}</span>
                                                </p>
                                        </div>
                                        <p className='text-sm text-slate-500'>Cập nhật lần cuối {formatDateTime(contract?.updatedAt) ?? '—'}</p>
				</div>
				<div className='space-y-3'>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Tài chính</p>
					<ul className='space-y-2 text-sm text-slate-600'>
						{budgetSummary && <li>{budgetSummary}</li>}
						{hourlyRate && (
							<li>
								Đơn giá theo giờ: <span className='font-semibold text-slate-800'>{hourlyRate}</span>
							</li>
						)}
						{fixedPrice && (
							<li>
								Giá trị hợp đồng: <span className='font-semibold text-slate-800'>{fixedPrice}</span>
							</li>
						)}
						{totalPaid && (
							<li>
								Đã thanh toán: <span className='font-semibold text-slate-800'>{totalPaid}</span>
							</li>
						)}
						{outstanding && (
							<li>
								Còn lại: <span className='font-semibold text-slate-800'>{outstanding}</span>
							</li>
						)}
					</ul>
				</div>
				<div className='space-y-3'>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Mốc thời gian</p>
					<ul className='space-y-2 text-sm text-slate-600'>
						<li>
							Bắt đầu:{' '}
							<span className='font-semibold text-slate-800'>
								{formatDateTime(contract?.startDate || contract?.offer?.startDate, { dateStyle: 'medium' }) ?? '—'}
							</span>
						</li>
						<li>
							Kết thúc:{' '}
							<span className='font-semibold text-slate-800'>
								{formatDateTime(contract?.endDate || contract?.offer?.endDate, { dateStyle: 'medium' }) ?? '—'}
							</span>
						</li>
						<li>
							Tạo hợp đồng:{' '}
							<span className='font-semibold text-slate-800'>
								{formatDateTime(contract?.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) ?? '—'}
							</span>
						</li>
					</ul>
				</div>
			</div>

			<div className={`grid gap-6 ${viewerRole === 'all' ? 'md:grid-cols-2' : ''}`}>
				{viewerRole !== 'client' && (
					<div className='rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
						<h3 className='text-sm font-semibold text-slate-800'>
							{viewerRole === 'freelancer' ? 'Khách hàng của bạn' : 'Thông tin khách hàng'}
						</h3>
						<div className='mt-4 flex items-start gap-3'>
							<Users className='mt-1 size-5 text-primary' />
							<div className='space-y-1 text-sm text-slate-600'>
								<p className='text-base font-semibold text-slate-900'>{clientName ?? 'Khách hàng'}</p>
								<p>{clientLocation ?? 'Chưa cập nhật vị trí'}</p>
								{contract?.client?.companyName && (
									<p>
										Công ty: <span className='font-medium text-slate-800'>{contract.client.companyName}</span>
									</p>
								)}
							</div>
						</div>
					</div>
				)}
				{viewerRole !== 'freelancer' && (
					<div className='rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
						<h3 className='text-sm font-semibold text-slate-800'>
							{viewerRole === 'client' ? 'Freelancer của bạn' : 'Thông tin freelancer'}
						</h3>
						<div className='mt-4 flex items-start gap-3'>
							<Users className='mt-1 size-5 text-secondary' />
							<div className='space-y-1 text-sm text-slate-600'>
								<p className='text-base font-semibold text-slate-900'>{freelancerName ?? 'Freelancer'}</p>
								<p>{freelancerLocation ?? 'Chưa cập nhật vị trí'}</p>
								{contract?.freelancer?.title && (
									<p>
										Chuyên môn: <span className='font-medium text-slate-800'>{contract.freelancer.title}</span>
									</p>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			<div className='rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
				<div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
					<div className='space-y-3'>
						<h3 className='text-sm font-semibold text-slate-800'>Chi tiết công việc</h3>
						<p className='text-base font-semibold text-slate-900'>
							{contract?.jobPost?.title ?? contract?.title ?? 'Chưa cập nhật tiêu đề'}
						</p>
						<p className='text-sm text-slate-600'>
							{contract?.jobPost?.specialty?.category?.name && (
								<span className='font-medium text-slate-800'>{contract.jobPost.specialty.category.name}</span>
							)}
							{contract?.jobPost?.specialty?.name && (
								<>
									{' '}
									· <span className='text-slate-600'>{contract.jobPost.specialty.name}</span>
								</>
							)}
						</p>
						{budgetSummary && <p className='text-sm text-slate-500'>Loại hợp đồng: {budgetSummary}</p>}
						{jobPostLink && (
							<Link
								to={jobPostLink}
								className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/20'>
								Xem job post gốc
							</Link>
						)}
					</div>
					<div className='space-y-3 text-sm text-slate-600 md:w-1/2'>
						{jobSkills.length > 0 && (
							<div className='space-y-2'>
								<p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Kỹ năng yêu cầu</p>
								<div className='flex flex-wrap gap-2'>
									{jobSkills.map(skill => (
										<span
											key={skill}
											className='rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm'>
											{skill}
										</span>
									))}
								</div>
							</div>
						)}
						{jobLanguages.length > 0 && (
							<div className='space-y-2'>
								<p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Ngôn ngữ</p>
								<p>{jobLanguages.join(', ')}</p>
							</div>
						)}
					</div>
				</div>

				{attachments.length > 0 && (
					<div className='mt-6 space-y-2'>
						<p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Tệp đính kèm</p>
						<div className='grid gap-3 md:grid-cols-2'>
							{attachments.slice(0, 4).map(attachment => (
								<a
									key={attachment.id}
									href={attachment.url}
									target='_blank'
									rel='noreferrer'
									className='flex items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm transition hover:border-primary/30 hover:text-primary'>
									<span className='truncate font-medium'>{attachment.name}</span>
									<span className='text-xs text-slate-400'>{formatFileSize(attachment.size) ?? ''}</span>
								</a>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)

	const renderMilestones = () => {
		if (milestoneQuery.isLoading) {
			return (
				<div className='flex justify-center py-12 text-slate-500'>
					<Loader2 className='size-6 animate-spin' />
				</div>
			)
		}

		const milestones = milestoneQuery.data ?? []
		if (!milestones.length) {
			return (
				<div className='rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-500 shadow-inner shadow-white/30'>
					<Flag className='mx-auto mb-3 size-8 text-primary' />
					<p className='text-base font-semibold text-slate-700'>Chưa có milestone nào</p>
					<p className='mt-2 text-sm text-slate-500'>Tạo milestones để chia nhỏ công việc và giải ngân theo tiến độ.</p>
				</div>
			)
		}

		return (
			<div className='grid gap-4 md:grid-cols-2'>
				{milestones.map(milestone => {
					const meta = getMilestoneStatusMeta(milestone.status)
					const amount = formatCurrency(milestone.amount ?? undefined, milestone.currency ?? currency)
					return (
						<div
							key={milestone.id}
							className='flex h-full flex-col justify-between rounded-[26px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
							<div className='space-y-4'>
								<div className='flex items-start justify-between gap-3'>
									<div>
										<h3 className='text-base font-semibold text-slate-900'>{milestone.title}</h3>
										<p className='mt-1 text-sm text-slate-500'>{milestone.description ?? 'Không có mô tả chi tiết.'}</p>
									</div>
									<span
										className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${meta.badge} ${meta.text}`}>
										<span className='size-2 rounded-full bg-current'></span>
										{meta.label}
									</span>
								</div>
								<ul className='space-y-2 text-sm text-slate-600'>
									<li>
										<CalendarClock className='mr-2 inline size-4 text-primary' /> Hạn hoàn thành:{' '}
										<span className='font-semibold text-slate-800'>
											{formatDateTime(milestone.dueDate, { dateStyle: 'medium' }) ?? '—'}
										</span>
									</li>
									<li>
										<CreditCard className='mr-2 inline size-4 text-secondary' /> Giá trị:{' '}
										<span className='font-semibold text-slate-800'>{amount ?? '—'}</span>
									</li>
									{milestone.approvedAt && (
										<li>
											<CheckCircle2 className='mr-2 inline size-4 text-emerald-500' /> Duyệt ngày:{' '}
											<span className='font-semibold text-slate-800'>
												{formatDateTime(milestone.approvedAt, { dateStyle: 'medium' })}
											</span>
										</li>
									)}
									{milestone.releasedAt && (
										<li>
											<ShieldCheck className='mr-2 inline size-4 text-primary' /> Giải ngân:{' '}
											<span className='font-semibold text-slate-800'>
												{formatDateTime(milestone.releasedAt, { dateStyle: 'medium' })}
											</span>
										</li>
									)}
								</ul>
							</div>
							<div className='mt-4 text-xs text-slate-400'>
								Tạo ngày {formatDateTime(milestone.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) ?? '—'}
							</div>
						</div>
					)
				})}
			</div>
		)
	}

	const renderFiles = () => {
		if (!attachments.length) {
			return (
				<div className='rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-500 shadow-inner shadow-white/30'>
					<FolderOpen className='mx-auto mb-3 size-8 text-secondary' />
					<p className='text-base font-semibold text-slate-700'>Chưa có tệp nào trong Workroom</p>
					<p className='mt-2 text-sm text-slate-500'>
						Hãy tải tài liệu liên quan tới hợp đồng để cả hai bên dễ dàng truy cập.
					</p>
				</div>
			)
		}

		return (
			<div className='space-y-3 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
				<table className='w-full table-fixed text-left text-sm text-slate-600'>
					<thead className='text-xs font-semibold uppercase tracking-wider text-slate-400'>
						<tr>
							<th className='pb-3'>Tên tệp</th>
							<th className='pb-3'>Dung lượng</th>
							<th className='pb-3'>Định dạng</th>
							<th className='pb-3 text-right'>Hành động</th>
						</tr>
					</thead>
					<tbody>
						{attachments.map(attachment => (
							<tr key={attachment.id} className='border-t border-white/70 last:border-b-0'>
								<td className='py-3 pr-4'>
									<span className='font-medium text-slate-800'>{attachment.name}</span>
								</td>
								<td className='py-3 pr-4'>{formatFileSize(attachment.size) ?? '—'}</td>
								<td className='py-3 pr-4'>{attachment.mimeType ?? '—'}</td>
								<td className='py-3 text-right'>
									{attachment.url ? (
										<a
											href={attachment.url}
											target='_blank'
											rel='noreferrer'
											className='inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/10'>
											Tải xuống
										</a>
									) : (
										<span className='text-xs text-slate-400'>Không có liên kết</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		)
	}

	const renderPayments = () => (
		<div className='grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'>
			<div className='space-y-6 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
				<h3 className='text-sm font-semibold text-slate-800'>Tổng quan thanh toán</h3>
				<div className='grid gap-4 md:grid-cols-2'>
					<div className='rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-emerald-700'>
						<p className='text-xs font-semibold uppercase tracking-[0.3em]'>Đã thanh toán</p>
						<p className='mt-2 text-2xl font-semibold text-emerald-900'>{totalPaid ?? '—'}</p>
						<p className='text-xs text-emerald-700/80'>Bao gồm các milestones đã duyệt và giải ngân.</p>
					</div>
					<div className='rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-amber-700'>
						<p className='text-xs font-semibold uppercase tracking-[0.3em]'>Số dư còn lại</p>
						<p className='mt-2 text-2xl font-semibold text-amber-900'>{outstanding ?? '—'}</p>
						<p className='text-xs text-amber-700/80'>Sẽ được thanh toán sau khi milestone hoàn tất.</p>
					</div>
				</div>
				<div className='space-y-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600'>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Phương thức thanh toán</p>
					<p>
						Quản lý thanh toán trực tiếp trong Workroom. Các khoản thanh toán sẽ hiển thị tại đây khi bạn phát hành
						milestone.
					</p>
					<p className='text-xs text-slate-400'>
						Lưu ý: hệ thống thanh toán đang được tích hợp, thông tin hiện tại chỉ mang tính mô phỏng.
					</p>
				</div>
			</div>
			<div className='space-y-4 rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-6 text-sm text-slate-500 shadow-inner shadow-white/30'>
				<h3 className='text-sm font-semibold text-slate-800'>Lịch sử gần đây</h3>
				<p>
					Chưa có giao dịch nào được ghi nhận. Khi milestones được duyệt và giải ngân, bạn sẽ thấy chi tiết tại đây.
				</p>
			</div>
		</div>
	)

	const renderHistory = () => {
		if (!timelineEvents.length) {
			return (
				<div className='rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-500 shadow-inner shadow-white/30'>
					<History className='mx-auto mb-3 size-8 text-slate-400' />
					<p className='text-base font-semibold text-slate-700'>Chưa có hoạt động nào được ghi nhận</p>
					<p className='mt-2 text-sm text-slate-500'>
						Những cập nhật của hợp đồng sẽ hiển thị tại đây theo trình tự thời gian.
					</p>
				</div>
			)
		}

		return (
			<div className='rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
				<ol className='relative border-l border-slate-200 pl-6'>
					{timelineEvents.map(event => (
						<li key={event.id} className='mb-6 last:mb-0'>
							<span className='absolute -left-[9px] mt-1 inline-flex size-4 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary'>
								<span className='size-2 rounded-full bg-primary'></span>
							</span>
							<p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>
								{formatDateTime(event.date, { dateStyle: 'medium', timeStyle: 'short' }) ?? '—'}
							</p>
							<p className='mt-2 text-sm font-semibold text-slate-800'>{event.label}</p>
							{event.description && <p className='text-sm text-slate-600'>{event.description}</p>}
						</li>
					))}
				</ol>
			</div>
		)
	}

	if (!contractId) {
		return (
			<div className='rounded-[32px] border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-500 shadow-inner shadow-white/30'>
				<p>Không tìm thấy hợp đồng. Vui lòng quay lại danh sách Workroom.</p>
				<Link
					to={routes.contracts.list}
					className='mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary'>
					Quay lại Workroom
				</Link>
			</div>
		)
	}

	if (contractQuery.isLoading) {
		return (
			<div className='flex justify-center py-20 text-slate-500'>
				<Loader2 className='size-6 animate-spin' />
			</div>
		)
	}

	if (contractQuery.isError) {
		return (
			<div className='rounded-[32px] border border-rose-200 bg-rose-50/70 p-10 text-center text-rose-600 shadow-inner shadow-white/30'>
				<p>Không thể tải thông tin hợp đồng. Vui lòng thử lại sau.</p>
				<button
					type='button'
					onClick={() => contractQuery.refetch()}
					className='mt-4 inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100'>
					Thử lại
				</button>
			</div>
		)
	}

	return (
		<div className='space-y-8'>
			<div className='flex flex-col gap-4 rounded-[38px] border border-white/60 bg-gradient-to-br from-primary/10 via-white to-secondary/20 p-6 shadow-[0_30px_110px_rgba(15,23,42,0.1)] md:flex-row md:items-center md:justify-between md:p-10'>
				<div className='space-y-4'>
					<button
						type='button'
						onClick={() => navigate(-1)}
						className='inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-primary/30 hover:text-primary'>
						<ArrowLeft className='size-4' /> Quay lại
					</button>
					<div className='space-y-2'>
						<span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary'>
							{heroBadge}
						</span>
						<h1 className='text-3xl font-bold text-slate-900 md:text-4xl'>
							{contract?.title ?? contract?.jobPost?.title ?? 'Workroom'}
						</h1>
						<p className='text-sm text-slate-600'>{heroSubtitle}</p>
					</div>
                                        <div className='flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 md:text-sm'>
                                                <span
                                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold shadow-sm shadow-primary/20 ${statusMeta.badge} ${statusMeta.text}`}>
                                                        <span className='size-2 rounded-full bg-current'></span>
                                                        {statusMeta.label}
                                                </span>
                                                <span className='inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-slate-600 shadow-sm shadow-white/40'>
                                                        <ShieldCheck className='size-3.5 text-primary' />
                                                        {statusDescription}
                                                </span>
                                                <span className='inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-slate-500 shadow-sm shadow-white/30'>
                                                        <CalendarClock className='size-3.5 text-secondary' />
                                                        Bắt đầu{' '}
                                                        {formatDateTime(contract?.startDate || contract?.offer?.startDate, { dateStyle: 'medium' }) ?? '—'}
                                                </span>
                                        </div>
				</div>
				<div className='flex flex-col items-start gap-3 md:items-end'>
					<div className='flex flex-wrap items-center gap-3'>
						{jobPostLink && (
							<Link
								to={jobPostLink}
								className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/20'>
								Xem job post
							</Link>
						)}
						<button
							type='button'
							className='inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm'
							disabled>
							Xuất hợp đồng (sắp ra mắt)
						</button>
					</div>
					{budgetSummary && <p className='text-sm text-slate-600'>Tổng quan: {budgetSummary}</p>}
				</div>
			</div>

			<nav className='flex flex-wrap items-center gap-2 rounded-[28px] border border-white/70 bg-white/85 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'>
				{tabs.map(tab => {
					const Icon = tab.icon
					const isActive = activeTab === tab.id
					return (
						<button
							key={tab.id}
							type='button'
							onClick={() => setActiveTab(tab.id)}
							className={`inline-flex items-center gap-2 rounded-[22px] px-4 py-2 text-sm font-semibold transition ${
								isActive
									? 'bg-gradient-to-r from-primary/90 to-secondary/80 text-white shadow-lg shadow-primary/25'
									: 'text-slate-500 hover:bg-primary/10 hover:text-primary'
							}`}>
							<Icon className='size-4' />
							{tab.label}
						</button>
					)
				})}
			</nav>

			<section className='rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] md:p-8'>
				{activeTab === 'overview' && renderOverview()}
				{activeTab === 'milestones' && renderMilestones()}
				{activeTab === 'files' && renderFiles()}
				{activeTab === 'payments' && renderPayments()}
				{activeTab === 'history' && renderHistory()}
			</section>
		</div>
	)
}

export default ContractWorkroomPage
