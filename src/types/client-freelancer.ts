export type ClientFreelancerSkill =
        | string
        | null
        | undefined
        | {
                  id?: string | number | null
                  name?: string | null
                  label?: string | null
                  title?: string | null
                  skill?: { id?: string | null; name?: string | null } | null
          }

export type ClientFreelancerPortfolioItem = {
        id?: string | number | null
        title?: string | null
        name?: string | null
        description?: string | null
        summary?: string | null
        caption?: string | null
        projectUrl?: string | null
        repositoryUrl?: string | null
        coverUrl?: string | null
        coverImage?: string | null
        coverAsset?: {
                url?: string | null
                secureUrl?: string | null
                path?: string | null
        } | null
        skills?: ClientFreelancerSkill[] | null
        startedAt?: string | null
        startDate?: string | null
        completedAt?: string | null
        endDate?: string | null
        publishedAt?: string | null
        createdAt?: string | null
        updatedAt?: string | null
} & Record<string, unknown>

export type ClientFreelancerListItem = {
        id?: string | number | null
        userId?: string | number | null
        freelancerId?: string | number | null
        fullName?: string | null
        name?: string | null
        firstName?: string | null
        lastName?: string | null
        avatar?: string | null
        imageUrl?: string | null
        photoUrl?: string | null
        picture?: string | null
        headline?: string | null
        title?: string | null
        bio?: string | null
        overview?: string | null
        about?: string | null
        summary?: string | null
        country?: string | null
        city?: string | null
        location?:
                | string
                | null
                | {
                          city?: string | null
                          cityName?: string | null
                          country?: string | null
                          countryName?: string | null
                  }
        hourlyRate?: number | string | null
        rate?: number | string | null
        hourlyRateCurrency?: string | null
        currency?: string | null
        experienceLevel?: string | null
        jobSuccessScore?: number | string | null
        jobSuccessPercent?: number | string | null
        jobSuccess?: number | string | null
        jobSuccessRate?: number | string | null
        successRate?: number | string | null
        totalEarned?: number | string | null
        completedJobs?: number | string | null
        rating?: number | string | null
        stats?: {
                jobSuccessScore?: number | string | null
                jobSuccessPercent?: number | string | null
                jobSuccess?: number | string | null
                jobSuccessRate?: number | string | null
                successRate?: number | string | null
                totalEarned?: number | string | null
                completedJobs?: number | string | null
                rating?: number | string | null
        } | null
        freelancerProfile?: {
                title?: string | null
                bio?: string | null
                overview?: string | null
                hourlyRate?: number | string | null
                currency?: string | null
                experienceLevel?: string | null
                city?: string | null
                country?: string | null
        } | null
        user?: {
                id?: string | number | null
                firstName?: string | null
                lastName?: string | null
                fullName?: string | null
                name?: string | null
                avatar?: string | null
                country?: string | null
                city?: string | null
        } | null
        skills?: ClientFreelancerSkill[] | null
        freelancerSkills?: ClientFreelancerSkill[] | null
        specialties?: Array<string | { id?: string | number | null; name?: string | null; label?: string | null }> | null
        freelancerSpecialties?: Array<string | { id?: string | number | null; name?: string | null; label?: string | null }> | null
} & Record<string, unknown>

export type ClientFreelancerDetail = ClientFreelancerListItem & {
        categories?: Array<{ id?: string | number | null; name?: string | null } | string> | null
        languages?: Array<{ name?: string | null; code?: string | null; languageCode?: string | null; proficiency?: string | null }> | null
        portfolios?: ClientFreelancerPortfolioItem[] | null
        portfolioItems?: ClientFreelancerPortfolioItem[] | null
        portfolio?: ClientFreelancerPortfolioItem[] | null
        experiences?: Array<
                | {
                          id?: string | number | null
                          title?: string | null
                          position?: string | null
                          role?: string | null
                          company?: string | null
                          organization?: string | null
                          description?: string | null
                          summary?: string | null
                          startedAt?: string | null
                          startDate?: string | null
                          completedAt?: string | null
                          endDate?: string | null
                  }
                | string
        > | null
} & Record<string, unknown>

export type PaginatedClientFreelancerResponse = {
        data?: ClientFreelancerListItem[] | null
        total?: number
        page?: number
        limit?: number
        message?: string
}
