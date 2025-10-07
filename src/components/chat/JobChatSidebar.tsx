import { Search } from 'lucide-react'
import { useSelector } from 'react-redux'
import { DEFAULT_AVATAR } from '~/constants/image'
import { selectCurrentUser } from '~/redux/user/userSlice'
import type { chatThread } from '~/types/chat'

type JobChatSidebarProps = {
	threads?: chatThread[]
	selectedThreadId: string
	onSelectThread: (_threadId: string) => void
	searchTerm: string
	participantOnlineIds: string[]
	onSearchTermChange: (_term: string) => void
}

export default function JobChatSidebar({
	threads,
	selectedThreadId,
	onSelectThread,
	searchTerm,
	participantOnlineIds,
	onSearchTermChange
}: JobChatSidebarProps) {
	const currentUser = useSelector(selectCurrentUser)

	return (
		<aside className='flex h-full flex-col rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur'>
			<div className='mb-4 flex flex-col gap-3'>
				<div>
					<h2 className='text-lg font-semibold text-slate-900'>Job conversations</h2>
					<p className='text-sm text-slate-500'>Chat with freelancers about active contracts and offers.</p>
				</div>
				<label className='relative block'>
					<span className='sr-only'>Search conversations</span>
					<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
					<input
						value={searchTerm}
						onChange={event => onSearchTermChange(event.target.value)}
						type='search'
						placeholder='Search by job, client or freelancer...'
						className='w-full rounded-2xl border border-white/80 bg-white/90 py-2 pl-10 pr-3 text-sm text-slate-600 shadow-inner shadow-primary/5 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20'
					/>
				</label>
			</div>

			<div className='-mx-2 flex-1 space-y-2 overflow-y-auto pr-2'>
				{threads?.length === 0 && (
					<div className='mx-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-center text-sm text-slate-500'>
						No conversations match your search. Try a different keyword.
					</div>
				)}
				{threads?.map(thread => {
					const isActive = thread.id === selectedThreadId
					return (
						<button
							key={thread.id}
							onClick={() => onSelectThread(thread.id)}
							className={`w-full rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white ${
								isActive
									? 'border-primary/20 bg-primary/10 shadow-[0_10px_30px_rgba(139,92,246,0.18)]'
									: 'border-transparent bg-white/60 hover:border-primary/20 hover:bg-primary/5'
							}`}>
							<div className='flex items-start justify-between gap-3'>
								<div>
									<div className='flex items-center gap-2'>
										<span className='text-sm font-semibold text-slate-900 line-clamp-1'>{thread.jobPost?.title}</span>
										<span className='rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600'>
											Active
										</span>
									</div>
									<div className='flex items-start gap-3'>
										<div
											className={`avatar ${
												thread.participants?.some(p => participantOnlineIds.includes(p.userId)) ? 'avatar-online' : ''
											} `}>
											<div className='w-12 rounded-full'>
												<img
													alt={'avatar'}
													src={
														thread.participants?.find(p => p.userId !== currentUser?.id)?.user?.avatar ?? DEFAULT_AVATAR
													}
												/>
											</div>
										</div>
										<div>
											<p className='mt-1 text-base text-slate-900'>
												{thread.participants?.find(p => p.userId !== currentUser?.id)?.user?.profile.firstName}{' '}
												{thread.participants?.find(p => p.userId !== currentUser?.id)?.user?.profile.lastName}
											</p>
											<p
												className={`mt-2 line-clamp-2 text-sm text-slate-600 ${
													thread?.messages &&
													thread?.messages?.length > 0 &&
													thread?.messages[0]?.receipts?.some(
														r => r.participant?.userId === currentUser?.id && !r.readAt
													)
														? 'font-bold'
														: ''
												}`}>
												{thread?.messages?.[0]?.body}
											</p>
										</div>
									</div>
								</div>
								<div className='flex flex-col items-end gap-2 text-xs text-slate-400'>
									<span>
										{new Intl.DateTimeFormat('en-US', {
											month: 'short',
											day: 'numeric'
										}).format(new Date(thread.updatedAt))}
									</span>

									{thread.unreadMessagesCount > 0 && (
										<span className='inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-white'>
											{thread.unreadMessagesCount}
										</span>
									)}
								</div>
							</div>
						</button>
					)
				})}
			</div>

			<div className='mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-slate-600'>
				<p className='font-medium text-slate-900'>Pro tip</p>
				<p className='mt-1 text-xs text-slate-500'>
					Stay in the same room as your contract so that work and payment stay protected.
				</p>
			</div>
		</aside>
	)
}
