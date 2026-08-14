export function getErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.') {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'error' in data) {
      const message = (data as { error?: { message?: string } }).error?.message;
      if (message) return message;
    }
  }
  return fallback;
}

/**
 * Đọc `error.details.code` do API trả về (vd: INVALID_TOKEN,
 * ALREADY_CONFIRMED...) để UI phân nhánh theo mã thay vì so khớp message.
 */
export function getErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'error' in data) {
      const code = (data as { error?: { details?: { code?: string } } }).error?.details?.code;
      if (code) return code;
    }
  }
  return null;
}
