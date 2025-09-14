import { useParams } from 'react-router-dom'
import AssignSkillsPanel from '~/components/skill/AssignSkillsPanel'

export default function CategorySkillsPage() {
	const { id: categoryId } = useParams()
	// const [picked, setPicked] = React.useState<SpecialtyLite | null>(null)

	return (
		<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
			<div className='lg:col-span-2'>
				<div className='flex items-center justify-between mb-2'>
					<h2 className='text-xl font-semibold'>Attach skills</h2>
				</div>
				<AssignSkillsPanel ownerType='category' ownerId={categoryId!} />
			</div>
		</div>
	)
}
