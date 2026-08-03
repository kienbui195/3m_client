import { formatCurrency, WALLET_TYPE_LABEL, TRANSACTION_TYPE_LABEL } from '@/lib/format';

describe('formatCurrency', () => {
  it('formats a whole VND amount', () => {
    expect(formatCurrency(1000000)).toContain('1.000.000');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0');
  });

  it('formats negative amounts (e.g. a saving-rate deficit)', () => {
    const result = formatCurrency(-500000);
    expect(result).toContain('-');
    expect(result).toContain('500.000');
  });

  it('formats large amounts (>100 triệu) without throwing', () => {
    expect(formatCurrency(500000000)).toContain('500.000.000');
  });
});

describe('WALLET_TYPE_LABEL / TRANSACTION_TYPE_LABEL', () => {
  it('has a Vietnamese label for every wallet type', () => {
    expect(WALLET_TYPE_LABEL).toEqual({
      cash: 'Tiền mặt',
      bank: 'Ngân hàng',
      ewallet: 'Ví điện tử',
      card: 'Thẻ',
    });
  });

  it('has a Vietnamese label for every transaction type', () => {
    expect(TRANSACTION_TYPE_LABEL).toEqual({
      income: 'Thu nhập',
      expense: 'Chi tiêu',
      transfer: 'Chuyển khoản',
    });
  });
});
