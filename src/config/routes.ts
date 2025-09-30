export const routes = {
        comons: {
                home: '/',
                onboarding: '/onboarding',
                chat: '/chat',
                freelancerProfile: (id?: string) => `/freelancer/${id || ''}`,
                policies: {
                        root: '/policies',
                        connectAccount: '/policies/connect-account'
                }
        },
        messages: {
                jobs: '/messages/jobs'
        },
        freelancer: {
                jobs: {
                        list: '/freelancer/jobs',
                        saved: '/freelancer/jobs/saved',
                        invitations: '/freelancer/jobs/proposals',
                        invitationDetail: (id: string = 'id') => `/freelancer/jobs/proposals/${id}`,
                        proposalEdit: (id: string = 'id') => `/freelancer/jobs/proposals/${id}/edit`,
                        proposalCreate: (jobId: string = 'id') => `/freelancer/jobs/${jobId}/proposal`,
                        detail: (id: string = 'id') => `/freelancer/jobs/${id}`
                }
        },
        auth: {
                signin: '/signin',
                signup: '/signup',
                verify: '/verify'
        },
        client: {
                freelancers: {
                        list: '/client/freelancers'
                }
        },
        me: {
                client: {
                        postJob: '/me/client/jobs/create',
                        jobs: {
                                list: '/me/client/jobs',
                                create: '/me/client/jobs/create',
                                edit: (id: string = 'id') => `/me/client/jobs/${id}/edit`,
                                detail: (id: string = 'id') => `/me/client/jobs/${id}`
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
