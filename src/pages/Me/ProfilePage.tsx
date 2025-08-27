const user = {
	name: 'Du D.',
	avatar: '/images/avatar.png', // đổi path
	location: 'Can Tho, Vietnam',
	localTime: '4:07 pm',
	profileUrl: '#',
	github: { name: 'Đỗ Thanh Dũ', url: '#', avatar: '/images/gh.png' },
	education: [
		{ school: 'Can Tho University', degree: 'Engineer’s degree, information teachnology', time: '2021-2025' }
	],
	skills: ['Web Development', 'Web Application'],
	languages: [{ name: 'English', level: 'Conversational' }]
}

const profileTitle = 'Other - Software Development | API, API Development, CSS, CSS 3, Git'

const bullets = [
	'Over 2 years of experience in programming with good communication and quick learning skills',
	'Strengths: Front-end technology and Back-end web application development',
	'Proficiency in HTML, CSS, JavaScript',
	'Strong proficiency in JavaScript, including DOM manipulation and the JavaScript object model'
]

export default function ProfilePage() {
	return (
		<div className='max-w-7xl mx-auto px-3 md:px-4 py-6 space-y-6'>
			{/* HEADER */}
			<div className='rounded-xl border border-base-200 bg-white/90 p-5 md:p-6'>
				<div className='flex flex-col sm:flex-row gap-4 sm:gap-6 items-start'>
					{/* avatar */}
					<div className='relative shrink-0'>
						<img src={user.avatar} className='w-24 h-24 rounded-full object-cover bg-base-200' />
						<button className='absolute -bottom-1 -right-1 bg-white border border-base-200 rounded-full p-1 shadow-sm'>
							<svg
								className='w-4 h-4 text-green-600'
								fill='none'
								stroke='currentColor'
								strokeWidth={2}
								viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' d='M15.232 5.232l3.536 3.536M9 11l6 6M3 21h18' />
							</svg>
						</button>
					</div>

					{/* name + location */}
					<div className='flex-1 min-w-0'>
						<h2 className='text-2xl font-bold leading-tight'>{user.name}</h2>
						<div className='mt-2 text-sm text-base-content/70'>{user.location}</div>
					</div>

					{/* buttons */}
					<div className='flex flex-col gap-2 w-full sm:w-auto'>
						<a
							href={user.profileUrl}
							className='btn btn-sm md:btn-md btn-outline border-primary text-primary hover:bg-green-50'>
							See public view
						</a>
						<button className='btn btn-sm md:btn-md btn-primary'>Profile settings</button>
					</div>
				</div>
			</div>

			{/* MAIN GRID: LEFT = info blocks, RIGHT = overview */}
			<div className='grid grid-cols-1 md:grid-cols-[1.15fr_2fr] gap-4'>
				{/* LEFT COLUMN (the small info blocks) */}
				<div className='space-y-4'>
					{/* Linked accounts */}
					<section className='rounded-xl border border-base-200 bg-white/90 p-4'>
						<h3 className='font-semibold mb-2'>Linked accounts</h3>
						<div className='flex items-center gap-3'>
							<img src={user.github.avatar} className='w-10 h-10 rounded-full object-cover border border-base-200' />
							<div className='min-w-0'>
								<div className='font-medium'>Đỗ Thanh Dũ</div>
								<a className='text-xs text-green-700 underline' href={user.github.url}>
									View profile
								</a>
							</div>
						</div>
						<button className='btn btn-xs btn-outline mt-3 text-red-600 border-red-200 hover:border-red-300'>
							Unlink
						</button>
					</section>

					{/* Education */}
					<section className='rounded-xl border border-base-200 bg-white/90 p-4'>
						<h3 className='font-semibold mb-2'>Education</h3>
						{user.education.map((e, i) => (
							<div key={i} className='text-sm'>
								<div className='font-medium'>{e.school}</div>
								<div className='text-base-content/70'>{e.degree}</div>
								<div className='text-base-content/60 text-xs'>{e.time}</div>
							</div>
						))}
					</section>

					{/* Skills */}
					<section className='rounded-xl border border-base-200 bg-white/90 p-4'>
						<h3 className='font-semibold mb-2'>Skills</h3>
						<div className='flex flex-wrap gap-2'>
							{user.skills.map(s => (
								<span key={s} className='px-3 py-1 rounded-full border border-base-200 bg-base-100 text-sm'>
									{s}
								</span>
							))}
						</div>
					</section>

					{/* Languages */}
					<section className='rounded-xl border border-base-200 bg-white/90 p-4'>
						<h3 className='font-semibold mb-2'>Languages</h3>
						{user.languages.map((l, i) => (
							<div key={i} className='text-sm'>
								<span className='font-medium'>{l.name}</span> <span className='text-base-content/60'>{l.level}</span>
							</div>
						))}
					</section>
				</div>

				{/* RIGHT COLUMN (overview content) */}
				<div className='space-y-4'>
					<section className='rounded-xl border border-base-200 bg-white/90 p-5'>
						<div className='flex items-start gap-2 mb-2'>
							<span className='inline-flex rounded-full border border-green-600 text-green-600 p-1'>
								<svg className='w-4 h-4' fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'>
									<path strokeLinecap='round' strokeLinejoin='round' d='M15.232 5.232l3.536 3.536M9 11l6 6M3 21h18' />
								</svg>
							</span>
							<h3 className='text-xl font-semibold leading-snug'>{profileTitle}</h3>
						</div>
						<div className='text-xs font-semibold mb-2'>$15.00/hr</div>
						<div className='text-sm mb-2'>Intern Front-end developer</div>
						<ul className='list-disc pl-5 text-sm text-base-content/80 space-y-1'>
							{bullets.map((t, i) => (
								<li key={i}>{t}</li>
							))}
						</ul>
					</section>

					{/* Portfolio section: (nếu cần cho y chang ảnh thì thêm ở đây) */}
					{/* ... */}
				</div>
			</div>
		</div>
	)
}
