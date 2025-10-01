const shimmerBaseClass =
	"relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:content-[''] before:pointer-events-none before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent"

const shimmerSectionClass =
	'rounded-3xl border border-white/60 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur'

type ChatLoadingStateProps = {
	showSummaryPanel?: boolean
}

export default function ChatLoadingState({ showSummaryPanel = false }: ChatLoadingStateProps) {
	const renderListPlaceholder = (items: number) =>
		Array.from({ length: items }).map((_, index) => (
			<div
				key={`thread-skeleton-${index}`}
				className={`h-20 rounded-2xl border border-white/50 bg-white/80 ${shimmerBaseClass}`}>
				<div className='flex h-full items-center gap-3 px-4'>
					<div className='h-12 w-12 rounded-full bg-primary/10'></div>
					<div className='flex flex-1 flex-col gap-2'>
						<div className='h-3.5 w-3/4 rounded-full bg-slate-200/70'></div>
						<div className='h-3 w-1/2 rounded-full bg-slate-200/60'></div>
					</div>
				</div>
			</div>
		))

	const renderMessagePlaceholder = (items: number) =>
		Array.from({ length: items }).map((_, index) => (
			<div key={`message-skeleton-${index}`} className='flex flex-col gap-3'>
				<div className={`w-fit max-w-[80%] rounded-3xl bg-white/85 px-6 py-4 shadow ${shimmerBaseClass}`}>
					<div className='flex flex-col gap-2'>
						<div className='h-3.5 w-32 rounded-full bg-slate-200/70'></div>
						<div className='h-3 w-40 rounded-full bg-slate-200/60'></div>
						<div className='h-3 w-28 rounded-full bg-slate-200/50'></div>
					</div>
				</div>
			</div>
		))

	const renderMilestonePlaceholder = (items: number) =>
		Array.from({ length: items }).map((_, index) => (
			<div
				key={`milestone-skeleton-${index}`}
				className={`rounded-2xl border border-white/60 bg-white/80 p-4 ${shimmerBaseClass}`}>
				<div className='flex flex-col gap-2'>
					<div className='h-3.5 w-2/3 rounded-full bg-slate-200/70'></div>
					<div className='h-3 w-24 rounded-full bg-slate-200/50'></div>
				</div>
			</div>
		))

	const gridClassName = showSummaryPanel
		? 'grid h-full min-h-[640px] w-full gap-6 lg:grid-cols-[260px_minmax(0,_1fr)] xl:grid-cols-[260px_minmax(0,_1.6fr)_300px] 2xl:grid-cols-[280px_minmax(0,_1.9fr)_340px]'
		: 'grid h-full min-h-[520px] w-full gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]'

	return (
		<div className={gridClassName}>
			<aside className={`flex min-h-0 flex-col gap-4 p-4 ${shimmerSectionClass}`}>
				<div className={`h-12 rounded-2xl bg-white/80 px-4 ${shimmerBaseClass}`}></div>
				<div className='flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-slate-400'>
					<span>Loading conversations</span>
					<span>...</span>
				</div>
				<div className='flex flex-1 flex-col gap-3 overflow-hidden'>{renderListPlaceholder(4)}</div>
				<div className={`h-12 rounded-2xl bg-primary/10 ${shimmerBaseClass}`}></div>
			</aside>

			<section className={`flex min-h-0 flex-col gap-4 p-4 ${shimmerSectionClass}`}>
				<header className={`rounded-2xl bg-white/85 p-5 shadow-sm ${shimmerBaseClass}`}>
					<div className='flex flex-col gap-3'>
						<div className='h-3.5 w-56 rounded-full bg-slate-200/70'></div>
						<div className='flex items-center gap-3'>
							<div className='h-3 w-24 rounded-full bg-slate-200/60'></div>
							<div className='h-3 w-16 rounded-full bg-slate-200/50'></div>
						</div>
					</div>
				</header>
				<div className='flex flex-1 min-h-0 flex-col gap-4 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-inner shadow-primary/5'>
					<div className='flex-1 space-y-5 overflow-hidden rounded-2xl bg-white/60 p-4'>
						{renderMessagePlaceholder(4)}
					</div>
					<div className={`h-20 rounded-3xl bg-white/90 px-6 py-4 shadow ${shimmerBaseClass}`}>
						<div className='flex h-full items-center gap-4'>
							<div className='h-10 w-10 rounded-full bg-slate-200/70'></div>
							<div className='h-3.5 flex-1 rounded-full bg-slate-200/60'></div>
							<div className='h-10 w-10 rounded-2xl bg-slate-200/70'></div>
						</div>
					</div>
				</div>
			</section>

			{showSummaryPanel ? (
				<aside className={`hidden min-h-0 flex-col gap-4 p-4 xl:flex ${shimmerSectionClass}`}>
					<div className={`rounded-3xl bg-white/85 p-5 shadow ${shimmerBaseClass}`}>
						<div className='flex flex-col gap-3'>
							<div className='h-3.5 w-32 rounded-full bg-slate-200/70'></div>
							<div className='h-3 w-24 rounded-full bg-slate-200/60'></div>
						</div>
					</div>
					<div className='flex flex-col gap-3'>{renderMilestonePlaceholder(3)}</div>
					<div className={`rounded-3xl bg-white/85 p-5 shadow ${shimmerBaseClass}`}>
						<div className='flex flex-col gap-3'>
							<div className='h-3.5 w-36 rounded-full bg-slate-200/70'></div>
							<div className='grid grid-cols-2 gap-3'>
								<div className='h-16 rounded-2xl bg-slate-200/40'></div>
								<div className='h-16 rounded-2xl bg-slate-200/40'></div>
								<div className='col-span-2 h-16 rounded-2xl bg-slate-200/40'></div>
							</div>
						</div>
					</div>
				</aside>
			) : null}
		</div>
	)
}
