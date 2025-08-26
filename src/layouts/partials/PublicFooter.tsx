export default function PublicFooter() {
	return (
		<footer className='border-t border-base-200'>
			<div className='max-w-7xl mx-auto px-4 py-8 text-sm text-base-content/70 flex flex-col md:flex-row gap-4 md:gap-8'>
				<p>© {new Date().getFullYear()} YourBrand. All rights reserved.</p>
				<nav className='flex gap-4'>
					<a className='link' href='#'>
						Terms
					</a>
					<a className='link' href='#'>
						Privacy
					</a>
					<a className='link' href='#'>
						Support
					</a>
				</nav>
			</div>
		</footer>
	)
}
