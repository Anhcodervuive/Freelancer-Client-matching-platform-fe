import { Briefcase, ChevronDown } from 'lucide-react'
import type { chatThread } from '~/types/chat'

type JobChatHeaderProps = {
	thread: chatThread
}

export default function JobChatHeader({ thread }: JobChatHeaderProps) {
	return (
		<header className='rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur'>
			<div className='flex flex-wrap items-center justify-between gap-4'>
				<div className='flex items-center gap-4'>
					<span className='inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary'>
						<Briefcase className='size-6' />
					</span>
					<div>
						<div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
							<span>{thread.jobPost?.title}</span>
							<button
								type='button'
								className='inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-primary/30 hover:text-primary'>
								View job post
								<ChevronDown className='size-3' />
							</button>
						</div>
						<p className='text-sm text-slate-500'>
							You {`· ${thread.participants?.map(p => p.user?.profile.firstName)}`}
						</p>
					</div>
				</div>
			</div>
		</header>
	)
}
