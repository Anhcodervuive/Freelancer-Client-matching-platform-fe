export const routes = {
        comons: {
                home: '/',
                onboarding: '/onboarding',
                freelancerProfile: (id?: string) => `/freelancer/${id || ''}`,
                policies: {
                        root: '/policies',
                        connectAccount: '/policies/connect-account'
                }
        },
        auth: {
                signin: '/signin',
                signup: '/signup',
                verify: '/verify'
        },
        me: {
                client: {
                        postJob: '/me/client/jobs/create',
                        jobs: {
                                list: '/me/client/jobs',
                                create: '/me/client/jobs/create',
                                edit: (id: string = 'id') => `/me/client/jobs/${id}/edit`
                        }
                },
                freelancer: {
                        profile: '/me/freelancer/profile'
                },
                setting: {
                        contactInfo: '/me/setting/contact-info',
                        getPaid: '/me/setting/get-paid',
                        payment: {
                                list: '/me/setting/payment-method',
                                create: '/me/setting/payment-method/create',
                                edit: (id: string) => `/me/setting/payment-method/edit/${id}`
			}
		}
	},
	admin: {
		category: {
			list: '/admin/categories',
			categorySpecialties: (id: string = 'id') => `/admin/categories/${id}/specialties`,
			categorySkills: (id: string = 'id') => `/admin/categories/${id}/skills`
		},
		specialty: {
			list: '/admin/specialties',
			specialtySkills: (id: string = 'id') => `/admin/specialties/${id}/skills`
		},
		project: '/admin/projects'
	},
	error: {
		notFound: '/404'
	}
}
