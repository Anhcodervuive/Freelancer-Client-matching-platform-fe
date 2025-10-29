import { Gavel } from 'lucide-react'

import { routes } from '~/config/routes'
import ArbitratorDisputeLayout from './components/DisputeLayout'

export default function ArbitratorDisputeListPage() {
        return (
                <ArbitratorDisputeLayout
                        icon={<Gavel className='h-6 w-6' />}
                        title='Danh sách tranh chấp'
                        description={
                                <>
                                        Theo dõi các tranh chấp được phân công cho bạn. Khi có hồ sơ mới, chúng tôi sẽ cập nhật vào
                                        khu vực này.
                                </>
                        }
                        breadcrumbs={[
                                { label: 'Trang chủ', to: routes.arbitrator.dashboard },
                                { label: 'Tranh chấp' }
                        ]}
                >
                        <section className='rounded-2xl border border-dashed border-base-300 bg-base-100 p-6 text-center shadow-sm'>
                                <h2 className='text-lg font-semibold'>Danh sách đang được xây dựng</h2>
                                <p className='mt-2 text-base-content/70'>
                                        Chúng tôi đang hoàn thiện danh sách tổng hợp cho trọng tài viên. Trong thời gian này, hãy truy
                                        cập trực tiếp vào hồ sơ tranh chấp bằng đường dẫn được gửi qua email hoặc bảng phân công nội bộ.
                                </p>
                        </section>
                        <section className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <h3 className='text-base font-semibold uppercase text-base-content/80'>Mẹo nhanh</h3>
                                <ul className='mt-4 space-y-3 text-left text-sm text-base-content/70'>
                                        <li>
                                                Sử dụng đường dẫn{' '}
                                                <code className='rounded bg-base-200 px-2 py-1 text-xs font-medium'>
                                                        {routes.arbitrator.disputes.detail('disputeId')}
                                                </code>{' '}
                                                và thay thế <strong>disputeId</strong> bằng mã tranh chấp thực tế.
                                        </li>
                                        <li>Khóa hồ sơ trọng tài sẽ hiển thị thời hạn ra quyết định trong phần thông tin chung.</li>
                                        <li>
                                                Sau khi hoàn tất phán quyết, hệ thống sẽ tự động cập nhật trạng thái và thông báo tới các
                                                bên liên quan.
                                        </li>
                                </ul>
                        </section>
                </ArbitratorDisputeLayout>
        )
}
