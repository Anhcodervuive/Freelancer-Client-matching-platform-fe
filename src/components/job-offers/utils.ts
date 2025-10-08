import type { JobOffer } from '~/types/job-offer'

export const computeJobOfferStatusCounts = (offers: JobOffer[]) => {
        const counts = new Map<JobOffer['status'], number>()

        offers.forEach(offer => {
                const status = offer.status
                counts.set(status, (counts.get(status) ?? 0) + 1)
        })

        return counts
}

export const getJobOfferFreelancerDisplayName = (offer: JobOffer) => {
        const name = offer.freelancer?.name?.trim()
        if (name) return name

        const email = offer.freelancer?.email?.trim()
        if (email) return email

        return 'Freelancer'
}
