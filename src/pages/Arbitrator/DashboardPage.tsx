export default function ArbitratorDashboardPage() {
        return (
                <div className='space-y-6'>
                        <section className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <h1 className='text-2xl font-semibold'>Xin chào, trọng tài viên!</h1>
                                <p className='mt-2 text-base-content/70'>
                                        Bảng điều khiển này giúp bạn theo dõi các tranh chấp đang chờ quyết định và truy cập nhanh vào
                                        hồ sơ trọng tài.
                                </p>
                        </section>
                        <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                                <article className='rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                                        <h2 className='text-sm font-medium text-base-content/60'>Hướng dẫn</h2>
                                        <p className='mt-2 text-sm text-base-content/70'>
                                                Truy cập mục <strong>Tranh chấp</strong> để xem hồ sơ trọng tài chi tiết và ghi nhận phán quyết.
                                        </p>
                                </article>
                                <article className='rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                                        <h2 className='text-sm font-medium text-base-content/60'>Trạng thái</h2>
                                        <p className='mt-2 text-sm text-base-content/70'>
                                                Khi phán quyết được ghi nhận thành công, hệ thống sẽ tự động cập nhật trạng thái tranh chấp
                                                và thông báo cho các bên liên quan.
                                        </p>
                                </article>
                                <article className='rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                                        <h2 className='text-sm font-medium text-base-content/60'>Tài nguyên</h2>
                                        <p className='mt-2 text-sm text-base-content/70'>
                                                Vui lòng tuân thủ quy trình nội bộ khi xem xét bằng chứng, dòng thời gian và các đề xuất đã
                                                gửi trước đó.
                                        </p>
                                </article>
                        </section>
                </div>
        )
}
