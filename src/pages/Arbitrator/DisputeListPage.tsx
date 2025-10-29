import { routes } from '~/config/routes'

export default function ArbitratorDisputeListPage() {
        return (
                <div className='space-y-6'>
                        <section className='rounded-2xl border border-dashed border-base-300 bg-base-100 p-6 text-center shadow-sm'>
                                <h1 className='text-xl font-semibold'>Danh sách tranh chấp được phân công</h1>
                                <p className='mt-2 text-base-content/70'>
                                        Chúng tôi đang xây dựng danh sách tổng hợp cho trọng tài viên. Trong thời gian này, hãy truy
                                        cập trực tiếp vào hồ sơ tranh chấp bằng đường dẫn được gửi qua email hoặc bảng phân công nội bộ.
                                </p>
                        </section>
                        <section className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <h2 className='text-lg font-semibold'>Mẹo nhanh</h2>
                                <ul className='mt-4 space-y-3 text-left text-sm text-base-content/70'>
                                        <li>
                                                Sử dụng đường dẫn <code className='rounded bg-base-200 px-2 py-1'>
                                                        {routes.arbitrator.disputes.detail('disputeId')}
                                                </code>{' '}
                                                và thay thế <strong>disputeId</strong> bằng mã tranh chấp thực tế.
                                        </li>
                                        <li>Khóa hồ sơ trọng tài sẽ hiển thị thời hạn ra quyết định trong phần thông tin chung.</li>
                                        <li>
                                                Sau khi hoàn tất phán quyết, hệ thống sẽ tự động cập nhật trạng thái và thông báo tới
                                                các bên liên quan.
                                        </li>
                                </ul>
                        </section>
                </div>
        )
}
