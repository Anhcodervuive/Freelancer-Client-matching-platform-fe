import { ContactInfoCard } from '~/components/setting/ContactInfoCard'
import { LocationCard } from '~/components/setting/locationInfoCard'

const ContactInfo = () => {
	return (
		<div className='flex flex-col gap-8'>
			<h2 className='font-semibold'>Contact info</h2>
			<ContactInfoCard />
			<LocationCard />
		</div>
	)
}

export default ContactInfo
