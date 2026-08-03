import { getErrorMessage } from '@/lib/errors';

describe('getErrorMessage', () => {
  const FALLBACK = 'Đã có lỗi xảy ra, vui lòng thử lại.';

  it('returns the default fallback for null', () => {
    expect(getErrorMessage(null)).toBe(FALLBACK);
  });

  it('returns the default fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe(FALLBACK);
  });

  it('returns the default fallback for a primitive error', () => {
    expect(getErrorMessage('boom')).toBe(FALLBACK);
  });

  it('returns the default fallback for an object without .data', () => {
    expect(getErrorMessage({ message: 'no data field' })).toBe(FALLBACK);
  });

  it('returns the default fallback when .data has no .error', () => {
    expect(getErrorMessage({ data: {} })).toBe(FALLBACK);
  });

  it('returns the default fallback when .data.error has no .message', () => {
    expect(getErrorMessage({ data: { error: {} } })).toBe(FALLBACK);
  });

  it('extracts the nested Strapi error message when fully shaped', () => {
    const err = { data: { error: { message: 'Số tiền không hợp lệ.' } } };
    expect(getErrorMessage(err)).toBe('Số tiền không hợp lệ.');
  });

  it('uses a custom fallback when provided and the shape does not match', () => {
    const custom = 'Xóa ví thất bại, vui lòng thử lại.';
    expect(getErrorMessage({}, custom)).toBe(custom);
  });

  it('prefers the nested message over a custom fallback when both are available', () => {
    const err = { data: { error: { message: 'Server message' } } };
    expect(getErrorMessage(err, 'Custom fallback')).toBe('Server message');
  });
});
