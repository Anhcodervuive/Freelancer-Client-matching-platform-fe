import { ContactInfoCard } from '~/components/setting/ContactInfoCard'
import { LocationCard } from '~/components/setting/locationInfoCard'

const ContactInfo = () => {
        return (
                <div className='space-y-6'>
                        <div>
                                <h1 className='text-2xl font-bold text-slate-900'>Contact information</h1>
                                <p className='mt-2 text-sm text-slate-500'>Giữ thông tin liên lạc của bạn luôn chính xác để khách hàng dễ dàng kết nối.</p>
                        </div>
                        <ContactInfoCard />
                        <LocationCard />
                </div>
        )
}

export default ContactInfo
