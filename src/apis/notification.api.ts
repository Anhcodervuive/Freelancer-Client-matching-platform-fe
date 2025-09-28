import authorizeAxiosInstance from '~/utils/authorizeAxios'

const notificationBaseUrl = '/notification'

export const deleteNotificationAPI = async (notificationId: string) => {
        const response = await authorizeAxiosInstance.delete(
                `${notificationBaseUrl}/${notificationId}`
        )

        return response.data
}

export default deleteNotificationAPI
