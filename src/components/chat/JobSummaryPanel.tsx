import { Calendar, ChevronLeft, ChevronRight, FileText, ImageIcon, ShieldCheck, Star } from 'lucide-react'
import type { ChatAttachment, JobMilestone } from './types'
import type { chatThread } from '~/types/chat'
import { Role } from '~/types/user'

type JobSummaryPanelProps = {
	thread: chatThread
	milestones: JobMilestone[]
	attachments: ChatAttachment[]
	isCollapsed: boolean
	onToggleCollapse: () => void
}

const milestoneStatusStyles: Record<JobMilestone['status'], string> = {
	completed: 'border-emerald-200 bg-emerald-50 text-emerald-600',
	inReview: 'border-amber-200 bg-amber-50 text-amber-600',
	upcoming: 'border-slate-200 bg-slate-50 text-slate-500'
}

function formatDate(date: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric'
	}).format(new Date(date))
}

export default function JobSummaryPanel({
	thread,
	milestones,
	attachments,
	isCollapsed,
	onToggleCollapse
}: JobSummaryPanelProps) {
	const images = attachments
		.filter(attachment => attachment.type === 'image')
		.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
	const files = attachments
		.filter(attachment => attachment.type === 'file')
		.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

	if (isCollapsed) {
		return (
			<aside className='flex h-full items-center justify-center rounded-3xl border border-white/60 bg-white/60 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur'>
				<button
					type='button'
					onClick={onToggleCollapse}
					className='flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3 py-4 text-xs font-semibold text-slate-600 shadow-inner shadow-primary/5 transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'>
					<ChevronLeft className='size-4' />
					<span>Expand</span>
				</button>
			</aside>
		)
	}

	return (
		<aside className='flex h-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/75 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur'>
			<div className='mb-3 flex justify-end'>
				<button
					type='button'
					onClick={onToggleCollapse}
					className='inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-500 shadow-inner shadow-primary/5 transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'>
					<span className='sr-only'>Collapse job summary</span>
					<span aria-hidden className='hidden sm:inline'>
						Collapse
					</span>
					<ChevronRight className='size-3' />
				</button>
			</div>
			<div className='flex-1 space-y-6 overflow-y-auto pr-1'>
				<section className='rounded-2xl border border-white/70 bg-white/90 p-4 shadow-inner shadow-primary/5'>
					<div className='flex items-start justify-between gap-3'>
						<div>
							<p className='text-xs font-medium uppercase tracking-wide text-primary/80'>Active contract</p>
							<h2 className='mt-1 text-lg font-semibold text-slate-900'>{thread.jobPost?.title}</h2>
							<p className='text-sm text-slate-500'>category</p>
						</div>
						<span className='inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600'>
							<ShieldCheck className='size-4' />
							Workroom
						</span>
					</div>
					<div className='mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600'>
						<div>
							<p className='text-xs uppercase tracking-wide text-slate-400'>Client</p>
							<p className='font-medium text-slate-900'>
								{thread.participants?.find(p => p.role === Role.CLIENT)?.user?.profile.firstName}
							</p>
							<p className='text-xs text-slate-500'>Premium member</p>
						</div>
						<div>
							<p className='text-xs uppercase tracking-wide text-slate-400'>Freelancer</p>
							<p className='font-medium text-slate-900'>
								{thread.participants?.find(p => p.role === Role.FREELANCER)?.user?.profile.firstName}
							</p>
							<p className='text-xs text-slate-500'>Top Rated Plus</p>
						</div>
						<div>
							<p className='text-xs uppercase tracking-wide text-slate-400'>Budget</p>
							<p className='font-medium text-slate-900'>{thread.jobPost?.budgetAmount}</p>
							<p className='text-xs text-slate-500'>Milestone based contract</p>
						</div>
						<div>
							<p className='text-xs uppercase tracking-wide text-slate-400'>Last update</p>
							<p className='font-medium text-slate-900'>{formatDate(thread.updatedAt.toString())}</p>
							<p className='text-xs text-slate-500'>Synced to your calendar</p>
						</div>
					</div>
				</section>

				<section className='rounded-2xl border border-white/70 bg-white/90 p-4 shadow-inner shadow-primary/5'>
					<header className='mb-3 flex items-center justify-between text-sm font-semibold text-slate-900'>
						<span>Milestones</span>
						<button type='button' className='text-xs font-medium text-primary transition hover:text-primary/80'>
							View contract
						</button>
					</header>
					<ol className='space-y-3'>
						{milestones.map(milestone => (
							<li
								key={milestone.id}
								className={`rounded-2xl border px-3 py-3 text-sm shadow-sm ${milestoneStatusStyles[milestone.status]}`}>
								<div className='flex items-center justify-between gap-3 text-slate-700'>
									<span className='font-semibold'>{milestone.title}</span>
									<span>{milestone.amount}</span>
								</div>
								<div className='mt-2 flex items-center gap-2 text-xs text-slate-500'>
									<Calendar className='size-3' />
									<span>Due {formatDate(milestone.dueDate)}</span>
									{milestone.status === 'completed' && (
										<span className='inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-600'>
											<Star className='size-3' />
											Released
										</span>
									)}
									{milestone.status === 'inReview' && (
										<span className='inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-amber-600'>
											Awaiting approval
										</span>
									)}
								</div>
							</li>
						))}
					</ol>
				</section>

				<section className='rounded-2xl border border-white/70 bg-white/90 p-4 shadow-inner shadow-primary/5'>
					<header className='mb-3 flex items-center justify-between text-sm font-semibold text-slate-900'>
						<span>Shared reviews</span>
						<span className='text-xs font-medium text-slate-400'>Sorted by newest</span>
					</header>
					{images.length > 0 ? (
						<div className='grid grid-cols-2 gap-3'>
							{images.map(image => (
								<a
									key={image.id}
									href={image.url}
									className='group overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-sm transition hover:shadow-lg hover:shadow-primary/10'
									download>
									<img
										src={image.previewUrl || image.url}
										alt={image.name}
										className='h-28 w-full object-cover transition duration-300 group-hover:scale-105'
									/>
									<div className='flex items-center justify-between px-3 py-2 text-xs text-slate-500'>
										<span className='flex items-center gap-1 font-medium text-slate-600'>
											<ImageIcon className='size-3 text-primary' />
											{image.name}
										</span>
										<span>{image.size}</span>
									</div>
								</a>
							))}
						</div>
					) : (
						<p className='text-sm text-slate-500'>No design reviews shared yet.</p>
					)}
				</section>

				<section className='rounded-2xl border border-white/70 bg-white/90 p-4 shadow-inner shadow-primary/5'>
					<header className='mb-3 flex items-center justify-between text-sm font-semibold text-slate-900'>
						<span>Shared files</span>
						<span className='text-xs font-medium text-slate-400'>Sorted by newest</span>
					</header>
					{files.length > 0 ? (
						<ul className='space-y-2 text-sm text-slate-600'>
							{files.map(file => (
								<li key={file.id}>
									<a
										href={file.url}
										className='flex items-center justify-between rounded-2xl border border-white/60 bg-white/90 px-3 py-2 transition hover:border-primary/30 hover:bg-primary/5'
										download>
										<span className='flex items-center gap-2 font-medium text-slate-700'>
											<span className='inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10'>
												<FileText className='size-4 text-primary' />
											</span>
											{file.name}
										</span>
										<span className='text-xs text-slate-400'>{file.size}</span>
									</a>
								</li>
							))}
						</ul>
					) : (
						<p className='text-sm text-slate-500'>Files that you send will appear here for easy review.</p>
					)}
				</section>
			</div>
		</aside>
	)
}
