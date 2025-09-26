import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, BriefcaseBusiness, ExternalLink, Languages, MapPin, Sparkles, Star, Target, Wallet } from 'lucide-react'
import { getClientFreelancerDetail } from '~/apis/client-freelancer.api'
import {
        formatCurrency,
        getFreelancerBio,
        getFreelancerCompletedJobs,
        getFreelancerExperienceLevel,
        getFreelancerHourlyRate,
        getFreelancerInitials,
        getFreelancerJobSuccess,
        getFreelancerLanguageList,
        getFreelancerLocation,
        getFreelancerName,
        getFreelancerPortfolioItems,
        getFreelancerRating,
        getFreelancerSkillNames,
        getFreelancerSpecialtyNames,
        getFreelancerTitle,
        getFreelancerTotalEarned,
        getFreelancerAvatar
} from './utils'
import type { ClientFreelancerDetail } from '~/types/client-freelancer'
import { routes } from '~/config/routes'

export default function ClientFreelancerDetailPage() {
        const navigate = useNavigate()
        const params = useParams<{ freelancerId: string }>()
        const freelancerId = params.freelancerId

        const { data, isLoading, isError, error } = useQuery<ClientFreelancerDetail>({
                queryKey: ['client-freelancer-detail', freelancerId],
                queryFn: () => getClientFreelancerDetail(freelancerId!),
                enabled: Boolean(freelancerId)
        })

        const content = useMemo(() => {
                if (!data) return null

                const name = getFreelancerName(data)
                const title = getFreelancerTitle(data)
                const avatar = getFreelancerAvatar(data)
                const initials = getFreelancerInitials(name)
                const location = getFreelancerLocation(data)
                const { amount: hourlyRateAmount, currency: hourlyRateCurrency } = getFreelancerHourlyRate(data)
                const hourlyRateDisplay = formatCurrency(hourlyRateAmount, hourlyRateCurrency)
                const jobSuccess = getFreelancerJobSuccess(data)
                const experienceLevel = getFreelancerExperienceLevel(data)
                const totalEarned = getFreelancerTotalEarned(data)
                const rating = getFreelancerRating(data)
                const completedJobs = getFreelancerCompletedJobs(data)
                const bio = getFreelancerBio(data)
                const specialties = getFreelancerSpecialtyNames(data)
                const skills = getFreelancerSkillNames(data)
                const languages = getFreelancerLanguageList(data)
                const portfolioItems = getFreelancerPortfolioItems(data)

                const stats = [
                        hourlyRateDisplay
                                ? {
                                          label: 'Hourly rate',
                                          value: `${hourlyRateDisplay}/hr`,
                                          icon: Wallet
                                  }
                                : null,
                        totalEarned !== undefined
                                ? {
                                          label: 'Total earned',
                                          value: formatCurrency(totalEarned, hourlyRateCurrency) ?? undefined,
                                          icon: Wallet
                                  }
                                : null,
                        jobSuccess !== undefined
                                ? {
                                          label: 'Job success',
                                          value: `${jobSuccess}%`,
                                          icon: Target
                                  }
                                : null,
                        rating !== undefined && Number.isFinite(rating)
                                ? {
                                          label: 'Rating',
                                          value: `${rating.toFixed(1)} / 5`,
                                          icon: Star
                                  }
                                : null,
                        completedJobs !== undefined
                                ? {
                                          label: 'Completed jobs',
                                          value: `${completedJobs}`,
                                          icon: BriefcaseBusiness
                                  }
                                : null
                ].filter((item): item is { label: string; value?: string; icon: LucideIcon } => Boolean(item))

                return {
                        name,
                        title,
                        avatar,
                        initials,
                        location,
                        hourlyRateDisplay,
                        experienceLevel,
                        stats,
                        bio,
                        specialties: specialties ?? [],
                        skills: skills ?? [],
                        languages,
                        portfolioItems
                }
        }, [data])

        if (!freelancerId) {
                return (
                        <div className='mx-auto w-full max-w-5xl px-4 py-16 text-center text-base-content/70'>
                                <p className='text-lg font-semibold text-base-content'>Freelancer not found</p>
                                <button
                                        type='button'
                                        onClick={() => navigate(-1)}
                                        className='mt-4 inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white'
                                >
                                        <ArrowLeft className='size-4' /> Go back
                                </button>
                        </div>
                )
        }

        if (isLoading) {
                return (
                        <div className='mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-0'>
                                <div className='animate-pulse space-y-6'>
                                        <div className='rounded-[42px] border border-white/60 bg-white/80 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.1)]'>
                                                <div className='flex flex-col gap-6 lg:flex-row lg:items-center'>
                                                        <div className='h-24 w-24 rounded-3xl bg-base-200/70' />
                                                        <div className='flex-1 space-y-3'>
                                                                <div className='h-6 w-2/3 rounded-full bg-base-200/70' />
                                                                <div className='h-4 w-1/2 rounded-full bg-base-200/60' />
                                                                <div className='h-4 w-1/3 rounded-full bg-base-200/50' />
                                                        </div>
                                                </div>
                                                <div className='mt-8 grid gap-4 md:grid-cols-2'>
                                                        <div className='h-24 rounded-3xl bg-base-200/60' />
                                                        <div className='h-24 rounded-3xl bg-base-200/50' />
                                                </div>
                                        </div>
                                        <div className='grid gap-6 md:grid-cols-2'>
                                                <div className='h-48 rounded-3xl border border-white/60 bg-white/70' />
                                                <div className='h-48 rounded-3xl border border-white/60 bg-white/70' />
                                        </div>
                                </div>
                        </div>
                )
        }

        if (isError) {
                return (
                        <div className='mx-auto w-full max-w-5xl px-4 py-16'>
                                <div className='rounded-3xl border border-rose-200 bg-rose-50/80 p-8 text-rose-600 shadow-inner shadow-rose-100'>
                                        <h2 className='text-xl font-semibold'>Unable to load freelancer profile</h2>
                                        <p className='mt-2 text-sm'>
                                                {(error as Error)?.message ||
                                                        'We were unable to fetch this freelancer profile. Please try again later.'}
                                        </p>
                                        <button
                                                type='button'
                                                onClick={() => navigate(-1)}
                                                className='mt-4 inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white'
                                        >
                                                <ArrowLeft className='size-4' /> Go back
                                        </button>
                                </div>
                        </div>
                )
        }

        if (!content) {
                return null
        }

        return (
                <div className='mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-0'>
                        <button
                                type='button'
                                onClick={() => navigate(-1)}
                                className='mb-6 inline-flex items-center gap-2 rounded-full border border-base-200 bg-white/80 px-4 py-2 text-sm font-semibold text-base-content/70 transition hover:border-primary hover:text-primary'
                        >
                                <ArrowLeft className='size-4' /> Back to results
                        </button>

                        <div className='relative overflow-hidden rounded-[42px] border border-white/70 bg-white/90 p-8 shadow-[0_35px_100px_rgba(15,23,42,0.12)]'>
                                <div className='pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl' />
                                <div className='pointer-events-none absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-secondary/15 blur-3xl' />
                                <div className='relative flex flex-col gap-6 lg:flex-row lg:items-center'>
                                        <div className='flex items-start gap-5'>
                                                <div className='flex h-24 w-24 items-center justify-center rounded-3xl border border-white/70 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/20 text-2xl font-semibold text-primary shadow-inner shadow-primary/20'>
                                                        {content.avatar ? (
                                                                <img
                                                                        src={content.avatar}
                                                                        alt={content.name}
                                                                        className='h-full w-full rounded-3xl object-cover'
                                                                />
                                                        ) : (
                                                                <span>{content.initials}</span>
                                                        )}
                                                </div>
                                                <div>
                                                        <h1 className='text-3xl font-bold text-base-content md:text-4xl'>{content.name}</h1>
                                                        {content.title && (
                                                                <p className='mt-1 text-base font-medium text-base-content/70'>{content.title}</p>
                                                        )}
                                                        <div className='mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-base-content/50'>
                                                                {content.location && (
                                                                        <span className='inline-flex items-center gap-1'>
                                                                                <MapPin className='size-3 text-primary' />
                                                                                {content.location}
                                                                        </span>
                                                                )}
                                                                {content.experienceLevel && (
                                                                        <span className='inline-flex items-center gap-1'>
                                                                                <BriefcaseBusiness className='size-3 text-secondary' />
                                                                                {content.experienceLevel}
                                                                        </span>
                                                                )}
                                                        </div>
                                                </div>
                                        </div>
                                        <div className='ml-auto grid gap-3 sm:grid-cols-2'>
                                                {content.stats.map(stat => (
                                                        <div
                                                                key={stat.label}
                                                                className='flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-base-content/80 shadow-inner shadow-white/40'
                                                        >
                                                                <span className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                                                                        <stat.icon className='size-4' />
                                                                </span>
                                                                <div>
                                                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-base-content/50'>{stat.label}</p>
                                                                        <p className='text-sm font-semibold text-base-content'>{stat.value ?? '—'}</p>
                                                                </div>
                                                        </div>
                                                ))}
                                        </div>
                                </div>

                                <div className='relative mt-6 flex flex-wrap items-center gap-3'>
                                        <button
                                                type='button'
                                                onClick={() => navigate(routes.me.client.jobs.create)}
                                                className='btn btn-primary rounded-full px-6 text-sm font-semibold normal-case shadow-lg shadow-primary/25'
                                        >
                                                Invite to job
                                        </button>
                                        <button
                                                type='button'
                                                className='btn btn-outline rounded-full border-primary px-6 text-sm font-semibold text-primary shadow-sm hover:bg-primary/10'
                                        >
                                                Save for later
                                        </button>
                                        {content.specialties.length > 0 && (
                                                <div className='flex flex-wrap gap-2 text-xs text-base-content/60'>
                                                        {content.specialties.map(specialty => (
                                                                <span
                                                                        key={specialty}
                                                                        className='inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-medium text-primary'
                                                                >
                                                                        {specialty}
                                                                </span>
                                                        ))}
                                                </div>
                                        )}
                                </div>
                        </div>

                        <div className='mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
                                <section className='space-y-6'>
                                        {content.bio && (
                                                <div className='rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm shadow-primary/5'>
                                                        <h2 className='text-lg font-semibold text-base-content'>About</h2>
                                                        <div className='mt-3 space-y-3 text-sm leading-relaxed text-base-content/70'>
                                                                {content.bio
                                                                        .split(/\n+/)
                                                                        .map((paragraph, index) => (
                                                                                <p key={`bio-${index}`}>{paragraph}</p>
                                                                        ))}
                                                        </div>
                                                </div>
                                        )}

                                        {content.languages.length > 0 && (
                                                <div className='rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm shadow-primary/5'>
                                                        <h2 className='flex items-center gap-2 text-lg font-semibold text-base-content'>
                                                                <Languages className='size-5 text-primary' /> Languages
                                                        </h2>
                                                        <ul className='mt-3 space-y-2 text-sm text-base-content/70'>
                                                                {content.languages.map(language => (
                                                                        <li key={`${language.name}-${language.proficiency ?? 'unknown'}`}>
                                                                                <span className='font-medium text-base-content'>{language.name}</span>
                                                                                {language.proficiency && (
                                                                                        <span className='ml-2 rounded-full bg-base-200 px-2 py-0.5 text-xs uppercase tracking-wide text-base-content/60'>
                                                                                                {language.proficiency}
                                                                                        </span>
                                                                                )}
                                                                        </li>
                                                                ))}
                                                        </ul>
                                                </div>
                                        )}

                                        {content.skills.length > 0 && (
                                                <div className='rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm shadow-primary/5'>
                                                        <h2 className='flex items-center gap-2 text-lg font-semibold text-base-content'>
                                                                <Sparkles className='size-5 text-secondary' /> Skills
                                                        </h2>
                                                        <div className='mt-3 flex flex-wrap gap-2'>
                                                                {content.skills.map(skill => (
                                                                        <span
                                                                                key={skill}
                                                                                className='inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary'
                                                                        >
                                                                                {skill}
                                                                        </span>
                                                                ))}
                                                        </div>
                                                </div>
                                        )}
                                </section>

                                <section className='space-y-6'>
                                        {content.portfolioItems.length > 0 && (
                                                <div className='rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm shadow-primary/5'>
                                                        <h2 className='text-lg font-semibold text-base-content'>Portfolio</h2>
                                                        <div className='mt-4 grid gap-4 md:grid-cols-2'>
                                                                {content.portfolioItems.map(item => (
                                                                        <div
                                                                                key={item.id}
                                                                                className='group overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-sm shadow-primary/5 transition hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(59,130,246,0.15)]'
                                                                        >
                                                                                {item.coverUrl && (
                                                                                        <div className='relative aspect-video overflow-hidden'>
                                                                                                <img
                                                                                                        src={item.coverUrl}
                                                                                                        alt={item.title}
                                                                                                        className='h-full w-full object-cover transition duration-500 group-hover:scale-105'
                                                                                                />
                                                                                        </div>
                                                                                )}
                                                                                <div className='space-y-3 p-4'>
                                                                                        <h3 className='text-base font-semibold text-base-content'>{item.title}</h3>
                                                                                        {item.description && (
                                                                                                <p className='text-sm text-base-content/70 line-clamp-3'>{item.description}</p>
                                                                                        )}
                                                                                        {item.skills.length > 0 && (
                                                                                                <div className='flex flex-wrap gap-2'>
                                                                                                        {item.skills.slice(0, 4).map(skill => (
                                                                                                                <span
                                                                                                                        key={`${item.id}-${skill}`}
                                                                                                                        className='inline-flex items-center rounded-full bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary'
                                                                                                                >
                                                                                                                        {skill}
                                                                                                                </span>
                                                                                                        ))}
                                                                                                </div>
                                                                                        )}
                                                                                        <div className='flex flex-wrap gap-3 text-xs font-semibold text-primary'>
                                                                                                {item.projectUrl && (
                                                                                                        <a
                                                                                                                href={item.projectUrl}
                                                                                                                target='_blank'
                                                                                                                rel='noreferrer'
                                                                                                                className='inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1 transition hover:bg-primary hover:text-white'
                                                                                                        >
                                                                                                                <ExternalLink className='size-3' /> View project
                                                                                                        </a>
                                                                                                )}
                                                                                                {item.repositoryUrl && (
                                                                                                        <a
                                                                                                                href={item.repositoryUrl}
                                                                                                                target='_blank'
                                                                                                                rel='noreferrer'
                                                                                                                className='inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1 transition hover:bg-primary hover:text-white'
                                                                                                        >
                                                                                                                <ExternalLink className='size-3' /> Repository
                                                                                                        </a>
                                                                                                )}
                                                                                        </div>
                                                                                </div>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                </div>
                                        )}
                                </section>
                        </div>
                </div>
        )
}
