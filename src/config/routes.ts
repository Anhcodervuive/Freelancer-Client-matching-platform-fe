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
			contactInfo: '/me/setting/contact-info'
		}
	},
	error: {
		notFound: '/404'
	}
}
