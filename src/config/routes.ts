export const routes = {
	comons: {
		home: '/'
	},
	auth: {
		signin: '/signin',
		signup: '/signup',
		verify: '/verify'
	},
	me: {
		client: {},
		freelancer: {
			profile: '/me/freelancer/profile'
		},
		setting: {
			contactInfo: '/me/setting/contact-info',
			payment: {
				list: '/me/setting/payment-method',
				create: '/me/setting/payment-method/create',
				edit: (id: string) => `/me/setting/payment-method/edit/${id}`
			}
		}
	},
	error: {
		notFound: '/404'
	}
}
