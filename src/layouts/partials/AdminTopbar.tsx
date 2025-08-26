export default function AdminTopbar() {
	return (
		<div className='sticky top-0 z-30 border-b border-base-200 bg-base-100/90 backdrop-blur'>
			<div className='flex items-center gap-3 px-4 py-3'>
				<h1 className='text-lg font-semibold'>Dashboard</h1>
				<div className='ml-auto flex items-center gap-4'>
					{/* Avatar */}
					<div className='flex items-center gap-2'>
						<div className='w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center font-semibold'>A</div>
						<div className='hidden md:block'>
							<p className='text-sm font-semibold'>Ava Anderson</p>
							<p className='text-xs text-success'>Active</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
