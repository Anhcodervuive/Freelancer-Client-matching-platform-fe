import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { User } from '~/types/user'
import type { RootState } from '~/redux/store'
import authorizeAxiosInstance from '~/utils/authorizeAxios'
import { toast } from 'react-toastify'
import type { SigninInputs } from '~/pages/Auth/SigninForm'
import type { UpdateProfileDto } from '~/types/profile'

export type UserState = {
	currentUser: User
}

const initialState: UserState = {
	currentUser: null
}

const authBaseUrl = '/auth'

export const signinUserAPI = createAsyncThunk('user/signinUserAPI', async (data: SigninInputs, { rejectWithValue }) => {
	try {
		const res = await authorizeAxiosInstance.post(`${authBaseUrl}/signin`, data)
		return res.data
	} catch (error) {
		return rejectWithValue(error)
	}
})

export const logoutUserAPI = createAsyncThunk(
	'user/logoutUserAPI',
	async (showSuccessMessage: boolean = true, { rejectWithValue }) => {
		try {
			const res = await authorizeAxiosInstance.post(`${authBaseUrl}/logout`)
			if (showSuccessMessage) {
				toast.success('Logged out successfully!')
			}

			return res.data
		} catch (error) {
			console.log(error)
			return rejectWithValue(error)
		}
	}
)

export const verifyUserAPI = createAsyncThunk('user/verifyUserAPI', async (token: string, { rejectWithValue }) => {
	try {
		const res = await authorizeAxiosInstance.put(`${authBaseUrl}/verify/${token}`)
		return res.data
	} catch (error) {
		return rejectWithValue(error)
	}
})

export const updateProfileAPI = createAsyncThunk(
	'user/updateProfileAPI',
	async (data: UpdateProfileDto, { rejectWithValue }) => {
		try {
			const res = await authorizeAxiosInstance.put('/profile', data)
			console.log(res.data)
			return res.data
		} catch (error) {
			console.log(error)
			return rejectWithValue(error)
		}
	}
)

const userSlice = createSlice({
	name: 'user',
	initialState,
	reducers: {
		siginGoogle: (state, action) => {
			const user = action.payload
			state.currentUser = user
		},
		updateProfile: (state, action) => {
			state.currentUser = {
				...state.currentUser,
				...action.payload
			}
		}
	},
	extraReducers: builder => {
		builder
			.addCase(signinUserAPI.fulfilled, (state, action) => {
				const user = action.payload

				state.currentUser = user
			})
			.addCase(logoutUserAPI.fulfilled, state => {
				state.currentUser = null
			})
			.addCase(updateProfileAPI.fulfilled, (state, action) => {
				const updatedUser = action.payload

				state.currentUser = updatedUser
			})
			.addCase(verifyUserAPI.fulfilled, (state, action) => {
				const user = action.payload

				state.currentUser = user
			})
	}
})

// Selector: nơi dành cho các component bên dưới gọi bằng hook useSelector để lấy dữ liệu
// từ trong redux store ra xử dụng
export interface SelectCurrentUserState {
	user: {
		currentUser: User | null
	}
}

export const selectCurrentUser = (state: RootState): User | null => {
	return state.user.currentUser
}

export const { siginGoogle, updateProfile } = userSlice.actions

export default userSlice.reducer
