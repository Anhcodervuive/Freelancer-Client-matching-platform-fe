// src/types/error-response.d.ts
export type APIErrorResponse = {
	message: string
	errorCode: number | string
	errors?: unknown
}
