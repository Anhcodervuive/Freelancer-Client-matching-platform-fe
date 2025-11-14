import axios from 'axios'
import env from '~/config/environment'

const publicAxiosInstance = axios.create({
        baseURL: env.ROOT_URL,
        timeout: 1000 * 60 * 5,
        withCredentials: false
})

export default publicAxiosInstance
