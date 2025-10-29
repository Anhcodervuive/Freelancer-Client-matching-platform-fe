import { Outlet } from 'react-router-dom'

import ArbitratorSidebar from './partials/ArbitratorSidebar'
import ArbitratorTopbar from './partials/ArbitratorTopbar'

export default function ArbitratorLayout() {
        return (
                <div className='drawer lg:drawer-open min-h-dvh bg-base-300'>
                        <input id='arbitrator-drawer' type='checkbox' className='drawer-toggle' />
                        <div className='drawer-content flex flex-col'>
                                <ArbitratorTopbar />
                                <main className='p-4 md:p-6 bg-base-100 shadow-inner rounded-t-2xl flex-1'>
                                        <Outlet />
                                </main>
                        </div>

                        <div className='drawer-side'>
                                <label htmlFor='arbitrator-drawer' aria-label='close sidebar' className='drawer-overlay' />
                                <ArbitratorSidebar />
                        </div>
                </div>
        )
}
