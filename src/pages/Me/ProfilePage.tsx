import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useLocation, useParams } from 'react-router-dom'
import { getProfileInfo } from '~/apis/profile.api'
import AvatarUploader from '~/components/setting/AvatarUploader'
import AboutSection from '~/components/setting/freelancer/AboutSection'
import { EducationSection } from '~/components/setting/freelancer/EducationSection'
import LanguageSection from '~/components/setting/freelancer/LanguageSection'
import SkillsSection from '~/components/setting/freelancer/SkillsSection'
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
                <div className=''>
			{/* HEADER */}
			<div className='rounded-xl border border-base-200 bg-white/90 p-5 md:p-6 mb-4'>
				<div className='flex flex-col sm:flex-row gap-4 sm:gap-6 items-start'>
                                        <AvatarUploader src={data?.avatar} editable={isEditable} />
                                        {/* name + location */}
                                        <div className='flex-1 min-w-0'>
                                                <h2 className='text-2xl font-bold leading-tight'>
                                                        {displayFirstName} {displayLastName}
                                                </h2>
                                                <div className='mt-2 text-sm text-base-content/70'>{displayCountry}</div>
                                        </div>

                                        {/* buttons */}
                                        {isEditable && (
                                                <div className='flex flex-col gap-2 w-full sm:w-auto'>
                                                        <a className='btn btn-sm md:btn-md btn-outline border-primary text-primary hover:bg-green-50'>
                                                                See public view
                                                        </a>
                                                        <button className='btn btn-sm md:btn-md btn-primary'>Profile settings</button>
                                                </div>
                                        )}
                                </div>
                        </div>

			{/* MAIN GRID: LEFT = info blocks, RIGHT = overview */}
			<div className='grid grid-cols-1 md:grid-cols-[1.15fr_2fr] gap-4'>
				{/* LEFT COLUMN (the small info blocks) */}
				<div className='space-y-4'>
                                        <EducationSection userId={userId} editable={isEditable} />

                                        <SkillsSection userId={userId} editable={isEditable} />

                                        <LanguageSection userId={userId} editable={isEditable} />
                                </div>

                                {/* RIGHT COLUMN (overview content) */}
                                <div className='space-y-4'>
                                        <AboutSection userId={userId} editable={isEditable} />

					{/* Portfolio section: (nếu cần cho y chang ảnh thì thêm ở đây) */}
					{/* ... */}
				</div>
			</div>
		</div>
	)
}
