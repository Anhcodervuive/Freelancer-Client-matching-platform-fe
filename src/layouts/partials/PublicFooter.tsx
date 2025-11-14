import { Link } from 'react-router-dom'

import { routes } from '~/config/routes'

export default function PublicFooter() {
        return (
                <footer className='mt-16 border-t border-white/60 bg-slate-900 text-slate-100'>
                        <div className='mx-auto w-full max-w-6xl px-4 py-12 md:px-6'>
                                <div className='grid gap-10 md:grid-cols-[2fr_1fr_1fr] xl:grid-cols-[2fr_1fr_1fr_1fr]'>
                                        <div className='space-y-4'>
                                                <div className='flex items-center gap-3'>
                                                        <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-primary text-white shadow-lg shadow-primary/30 ring-2 ring-white/40'>
                                                                <span className='text-base font-semibold leading-none'>W</span>
                                                        </span>
                                                        <span className='text-lg font-semibold tracking-tight'>Workreap-ish</span>
                                                </div>
                                                <p className='text-sm text-slate-300'>
                                                        A refined marketplace experience crafted for freelancers and clients to collaborate with clarity and style.
                                                </p>
                                                <div className='flex gap-3 text-slate-300'>
                                                        <a className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition hover:border-primary/40 hover:text-primary' href='#'>
                                                                fb
                                                        </a>
                                                        <a className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition hover:border-primary/40 hover:text-primary' href='#'>
                                                                ig
                                                        </a>
                                                        <a className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition hover:border-primary/40 hover:text-primary' href='#'>
                                                                in
                                                        </a>
                                                </div>
                                        </div>

                                        <div className='space-y-3'>
                                                <h4 className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-300'>Marketplace</h4>
                                                <nav className='flex flex-col gap-2 text-sm text-slate-300'>
                                                        <a className='transition hover:text-white' href='#'>Browse jobs</a>
                                                        <a className='transition hover:text-white' href='#'>Top freelancers</a>
                                                        <a className='transition hover:text-white' href='#'>Project catalog</a>
                                                        <a className='transition hover:text-white' href='#'>Success stories</a>
                                                </nav>
                                        </div>

                                        <div className='space-y-3'>
                                                <h4 className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-300'>Company</h4>
                                                <nav className='flex flex-col gap-2 text-sm text-slate-300'>
                                                        <a className='transition hover:text-white' href='#'>About</a>
                                                        <a className='transition hover:text-white' href='#'>Blog</a>
                                                        <a className='transition hover:text-white' href='#'>Careers</a>
                                                        <a className='transition hover:text-white' href='#'>Contact</a>
                                                </nav>
                                        </div>

                                        <div className='space-y-3'>
                                                <h4 className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-300'>Stay in the loop</h4>
                                                <p className='text-sm text-slate-300'>Get design updates and curated jobs directly to your inbox.</p>
                                                <form className='flex w-full flex-col gap-2 sm:flex-row'>
                                                        <input type='email' required placeholder='you@email.com' className='input input-sm flex-1 rounded-full border border-white/20 bg-white/10 text-sm text-white placeholder:text-slate-400 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40' />
                                                        <button type='submit' className='btn btn-sm rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-white shadow-lg shadow-primary/30 hover:shadow-primary/40'>
                                                                Subscribe
                                                        </button>
                                                </form>
                                        </div>
                                </div>

                                <div className='mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 md:flex-row md:items-center md:justify-between'>
                                        <p>© {new Date().getFullYear()} Workreap-ish. All rights reserved.</p>
                                        <nav className='flex flex-wrap gap-4'>
                                                <Link
                                                        className='transition hover:text-white'
                                                        to={routes.comons.platformTerms}
                                                >
                                                        Terms
                                                </Link>
                                                <a className='transition hover:text-white' href='#'>Privacy</a>
                                                <a className='transition hover:text-white' href='#'>Support</a>
                                                <a className='transition hover:text-white' href='#'>Status</a>
                                        </nav>
                                </div>
                        </div>
                </footer>
        )
}
