import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export type ArbitratorDisputeBreadcrumb = {
        label: string
        to?: string
}

type ArbitratorDisputeLayoutProps = {
        title: string
        description?: ReactNode
        icon?: ReactNode
        breadcrumbs?: ArbitratorDisputeBreadcrumb[]
        actions?: ReactNode
        meta?: ReactNode
        children: ReactNode
}

export default function ArbitratorDisputeLayout({
        title,
        description,
        icon,
        breadcrumbs,
        actions,
        meta,
        children
}: ArbitratorDisputeLayoutProps) {
        return (
                <div className='space-y-6'>
                        <section className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                {breadcrumbs && breadcrumbs.length ? (
                                        <nav className='mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-base-content/60'>
                                                {breadcrumbs.map((breadcrumb, index) => (
                                                        <div key={`${breadcrumb.label}-${index}`} className='flex items-center gap-2'>
                                                                {breadcrumb.to ? (
                                                                        <Link to={breadcrumb.to} className='transition hover:text-base-content'>
                                                                                {breadcrumb.label}
                                                                        </Link>
                                                                ) : (
                                                                        <span>{breadcrumb.label}</span>
                                                                )}
                                                                {index < breadcrumbs.length - 1 ? (
                                                                        <ChevronRight className='h-3 w-3 opacity-60' />
                                                                ) : null}
                                                        </div>
                                                ))}
                                        </nav>
                                ) : null}

                                <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                                        <div className='flex flex-1 items-start gap-4'>
                                                {icon ? (
                                                        <span className='inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
                                                                {icon}
                                                        </span>
                                                ) : null}
                                                <div className='space-y-3'>
                                                        <div>
                                                                <h1 className='text-2xl font-semibold text-base-content'>{title}</h1>
                                                                {description ? (
                                                                        <div className='mt-2 text-sm text-base-content/70'>{description}</div>
                                                                ) : null}
                                                        </div>
                                                        {actions ? <div className='flex flex-wrap items-center gap-3'>{actions}</div> : null}
                                                </div>
                                        </div>
                                        {meta ? (
                                                <div className='mt-2 flex flex-col gap-2 text-sm text-base-content/70 md:mt-0 md:text-right'>
                                                        {meta}
                                                </div>
                                        ) : null}
                                </div>
                        </section>

                        <div className='space-y-6'>{children}</div>
                </div>
        )
}
