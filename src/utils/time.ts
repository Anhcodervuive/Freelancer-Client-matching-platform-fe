/**
 * Kiểm tra xem thời gian truyền vào có nằm trong 5 phút gần nhất hay không.
 * @param time - Có thể là Date hoặc chuỗi ISO (string) hoặc timestamp (number)
 * @param minutesAgo - Khoảng thời gian giới hạn (mặc định 5 phút)
 * @returns true nếu nằm trong khoảng minutesAgo gần nhất, ngược lại false
 */
export function isWithinLastMinutes(time: Date | string | number, minutesAgo = 5): boolean {
	const now = Date.now()
	const target = new Date(time).getTime()

	// Nếu giá trị không hợp lệ → false
	if (isNaN(target)) return false

	const diffMs = now - target
	const diffMinutes = diffMs / 1000 / 60

	return diffMinutes >= 0 && diffMinutes <= minutesAgo
}
