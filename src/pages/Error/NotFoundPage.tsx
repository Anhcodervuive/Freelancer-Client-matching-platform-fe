import { Link, useNavigate } from 'react-router-dom'
import { Compass, ArrowLeft, Home, LifeBuoy } from 'lucide-react'

const NotFoundPage = () => {
        const navigate = useNavigate()

        return (
                <div className='relative flex min-h-[60vh] flex-1 items-center justify-center overflow-hidden px-6 py-16 text-slate-900 md:px-10'>
                        <div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_55%)] md:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_60%)]' />
                        <div className='pointer-events-none absolute inset-y-0 left-1/2 -z-10 hidden h-[120%] w-[120%] -translate-x-1/2 rounded-[140px] border border-white/80 bg-white/70 shadow-[0_35px_120px_rgba(15,23,42,0.12)] backdrop-blur-xl md:block' />
                        <div className='relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center'>
                                <div className='relative flex h-28 w-28 items-center justify-center rounded-[36px] border border-primary/30 bg-gradient-to-br from-white via-white to-primary/10 text-primary shadow-lg shadow-primary/20'>
                                        <div className='absolute -bottom-4 right-0 h-16 w-16 rounded-3xl bg-white/80 shadow-lg shadow-primary/10 backdrop-blur'>
                                                <Compass className='mx-auto mt-4 h-8 w-8 text-primary' />
                                        </div>
                                        <span className='text-4xl font-bold tracking-tight'>404</span>
                                </div>
                                <div className='space-y-4'>
                                        <h1 className='text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl'>Chúng tôi không tìm thấy trang bạn cần</h1>
                                        <p className='mx-auto max-w-2xl text-base text-slate-600'>Có thể đường dẫn đã bị thay đổi hoặc nội dung không còn tồn tại. Bạn có thể quay lại trang trước đó hoặc trở về trang chủ để tiếp tục khám phá nền tảng Workreap-ish.</p>
                                </div>
                                <div className='flex flex-wrap items-center justify-center gap-3'>
                                        <button
                                                type='button'
                                                onClick={() => navigate(-1)}
                                                className='inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
                                        >
                                                <ArrowLeft className='h-4 w-4' />
                                                Quay lại
                                        </button>
                                        <Link
                                                to='/'
                                                className='inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:shadow-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
                                        >
                                                <Home className='h-4 w-4' />
                                                Về trang chủ
                                        </Link>
                                        <a
                                                href='mailto:support@workreap-ish.com'
                                                className='inline-flex items-center gap-2 rounded-2xl border border-transparent bg-white/60 px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
                                        >
                                                <LifeBuoy className='h-4 w-4' />
                                                Liên hệ hỗ trợ
                                        </a>
                                </div>
                                <div className='grid w-full gap-4 rounded-3xl border border-white/60 bg-white/70 p-6 text-left shadow-lg shadow-primary/5 backdrop-blur'>
                                        <div>
                                                <h2 className='text-sm font-semibold uppercase tracking-wider text-primary/80'>Gợi ý nhanh</h2>
                                                <ul className='mt-3 space-y-2 text-sm text-slate-600'>
                                                        <li>• Kiểm tra lại chính tả của đường dẫn hoặc liên kết vừa truy cập.</li>
                                                        <li>• Sử dụng thanh điều hướng để tìm đúng khu vực bạn cần quản lý.</li>
                                                        <li>• Nếu bạn nghĩ đây là lỗi hệ thống, hãy gửi phản hồi cho đội ngũ hỗ trợ.</li>
                                                </ul>
                                        </div>
                                </div>
                        </div>
                </div>
        )
}

export default NotFoundPage
