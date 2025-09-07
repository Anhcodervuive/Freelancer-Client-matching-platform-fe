import { useSelector } from 'react-redux'
import AvatarUploader from '~/components/setting/AvatarUploader'
import AboutSection from '~/components/setting/freelancer/AboutSection'
import { EducationSection } from '~/components/setting/freelancer/EducationSection'
import LanguageSection from '~/components/setting/freelancer/LanguageSection'
import { selectCurrentUser } from '~/redux/user/userSlice'

export default function ProfilePage() {
	const reduxUser = useSelector(selectCurrentUser)
	return (
		<div className=''>
			{/* HEADER */}
			<div className='rounded-xl border border-base-200 bg-white/90 p-5 md:p-6 mb-4'>
				<div className='flex flex-col sm:flex-row gap-4 sm:gap-6 items-start'>
					<AvatarUploader src={reduxUser?.avatar ?? 'avatar.png'} />
					{/* name + location */}
					<div className='flex-1 min-w-0'>
						<h2 className='text-2xl font-bold leading-tight'>
							{reduxUser?.firstName} {reduxUser?.lastName}
						</h2>
						<div className='mt-2 text-sm text-base-content/70'>{reduxUser?.country}</div>
					</div>

					{/* buttons */}
					<div className='flex flex-col gap-2 w-full sm:w-auto'>
						<a className='btn btn-sm md:btn-md btn-outline border-primary text-primary hover:bg-green-50'>
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
					<EducationSection userId={reduxUser?.id} />

					{/* Skills */}
					<section className='rounded-xl border border-base-200 bg-white/90 p-4'>
						<h3 className='font-semibold mb-2'>Skills</h3>
						<div className='flex flex-wrap gap-2'></div>
					</section>

					<LanguageSection userId={reduxUser?.id} />
				</div>

				{/* RIGHT COLUMN (overview content) */}
				<div className='space-y-4'>
					<AboutSection userId={reduxUser?.id} />

					{/* Portfolio section: (nếu cần cho y chang ảnh thì thêm ở đây) */}
					{/* ... */}
				</div>
			</div>
		</div>
	)
}
