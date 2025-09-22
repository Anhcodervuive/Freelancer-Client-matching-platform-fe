import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getProfileInfo } from '~/apis/profile.api'
import AvatarUploader from '~/components/setting/AvatarUploader'
import AboutSection from '~/components/setting/freelancer/AboutSection'
import CategorySpecialtySection from '~/components/setting/freelancer/CategorySpecialtySection'
import { EducationSection } from '~/components/setting/freelancer/EducationSection'
import LanguageSection from '~/components/setting/freelancer/LanguageSection'
import PortfolioSection from '~/components/setting/freelancer/portfolio/PortfolioSection'
import SkillsSection from '~/components/setting/freelancer/SkillsSection'
import { routes } from '~/config/routes'
import { selectCurrentUser } from '~/redux/user/userSlice'

export default function ProfilePage() {
	const signInUser = useSelector(selectCurrentUser)
	const location = useLocation()
	const { id: freelancerId } = useParams()

	// Kiểm tra route hiện tại có chứa chữ "freelancer"
	const isCurrentSignInUserRoute = location.pathname.includes('/me/freelancer/profile')
	const userId = isCurrentSignInUserRoute ? signInUser?.id : freelancerId
	const isEditable = isCurrentSignInUserRoute

	const { data } = useQuery({
		queryKey: ['profile-data', userId],
		queryFn: () => getProfileInfo(userId!),
		enabled: !!userId
	})

	const displayFirstName = data?.firstName ?? signInUser?.firstName
	const displayLastName = data?.lastName ?? signInUser?.lastName
	const displayCountry = data?.country ?? signInUser?.country
	return (
		<div className='space-y-8'>
			<div className='relative overflow-hidden rounded-[38px] border border-white/70 bg-white/85 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] md:p-8'>
				<div className='absolute -left-16 top-0 h-44 w-44 rounded-full bg-primary/15 blur-3xl' aria-hidden></div>
				<div className='absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-secondary/15 blur-3xl' aria-hidden></div>
				<div className='relative flex flex-col gap-6 md:flex-row md:items-center'>
					<div className='flex items-center gap-4 md:gap-6'>
						<div className='rounded-3xl border border-white/70 bg-white/70 p-2 shadow-inner shadow-white/20'>
							<AvatarUploader src={data?.avatar} editable={isEditable} />
						</div>
						<div className='space-y-1'>
							<h1 className='text-3xl font-bold text-slate-900 md:text-4xl'>
								{displayFirstName} {displayLastName}
							</h1>
							<p className='text-sm font-medium uppercase tracking-[0.28em] text-primary/80'>Freelancer</p>
							<p className='text-sm text-slate-500'>{displayCountry ?? 'Location unavailable'}</p>
						</div>
					</div>

					{isEditable && (
						<div className='ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'>
							<Link
								to={routes.comons.freelancerProfile(signInUser?.id)}
								className='btn btn-outline btn-sm rounded-full border border-primary/40 bg-primary/5 px-5 text-primary hover:border-primary/60 hover:bg-primary/10 sm:btn-md'>
								See public view
							</Link>
							<button className='btn btn-sm bg-gradient-to-r from-primary to-secondary px-5 text-white shadow-lg shadow-primary/30 transition hover:shadow-primary/40 sm:btn-md'>
								Profile settings
							</button>
						</div>
					)}
				</div>
			</div>

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]'>
				<div className='space-y-6'>
					<EducationSection userId={userId} editable={isEditable} />
					<SkillsSection userId={userId} editable={isEditable} />
					<LanguageSection userId={userId} editable={isEditable} />
				</div>

				<div className='space-y-6'>
					<AboutSection userId={userId} editable={isEditable} />
					{isEditable && userId && <CategorySpecialtySection userId={userId} editable={isEditable} />}
					<PortfolioSection userId={userId} editable={isEditable} />
				</div>
			</div>
		</div>
	)
}
