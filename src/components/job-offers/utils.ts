import type { JobOffer } from '~/types/job-offer'

export const computeJobOfferStatusCounts = (offers: JobOffer[]) => {
        const counts = new Map<JobOffer['status'], number>()

        offers.forEach(offer => {
                const status = offer.status
                counts.set(status, (counts.get(status) ?? 0) + 1)
        })

        return counts
}
