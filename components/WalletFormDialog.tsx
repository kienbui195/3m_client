'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BankIcon, CreditCardIcon, DeviceMobileIcon, MoneyIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWalletMutation, useUpdateWalletMutation } from '@/api/walletApi';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { Wallet, WalletType } from '@/types/api';

const WALLET_TYPE_META: Record<
  WalletType,
  { label: string; icon: typeof BankIcon; activeClass: string }
> = {
  bank: {
    label: 'Ngân hàng',
    icon: BankIcon,
    activeClass: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  ewallet: {
    label: 'Ví điện tử',
    icon: DeviceMobileIcon,
    activeClass: 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  card: {
    label: 'Thẻ',
    icon: CreditCardIcon,
    activeClass: 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  cash: {
    label: 'Tiền mặt',
    icon: MoneyIcon,
    activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
};
const WALLET_TYPE_ORDER: WalletType[] = ['bank', 'ewallet', 'card', 'cash'];

interface WalletFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: Wallet;
  onSuccess?: () => void;
}

export function WalletFormDialog({ open, onOpenChange, wallet, onSuccess }: WalletFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* key thay đổi mỗi lần mở dialog -> remount, state form tự khởi tạo lại
            từ props thay vì phải reset bằng effect. */}
        {open && (
          <WalletFormBody
            key={wallet?.documentId ?? 'create'}
            wallet={wallet}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function WalletFormBody({
  wallet,
  onOpenChange,
  onSuccess,
}: {
  wallet?: Wallet;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(wallet);
  const [name, setName] = useState(wallet?.name ?? '');
  const [type, setType] = useState<WalletType>(wallet?.type ?? 'cash');
  const [balance, setBalance] = useState(wallet ? String(wallet.balance) : '0');
  const [accountNumber, setAccountNumber] = useState(wallet?.accountNumber ?? '');
  const [note, setNote] = useState(wallet?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const [createWallet, { isLoading: isCreating }] = useCreateWalletMutation();
  const [updateWallet, { isLoading: isUpdating }] = useUpdateWalletMutation();
  const isSubmitting = isCreating || isUpdating;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Vui lòng nhập tên ví.');
      return;
    }

    const parsedBalance = Number(balance.replace(/,/g, ''));
    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      setError('Số dư không hợp lệ.');
      return;
    }

    const commonData = {
      name: name.trim(),
      type,
      balance: parsedBalance,
      accountNumber: accountNumber.trim() || undefined,
      note: note.trim() || undefined,
    };

    try {
      if (isEdit && wallet) {
        await updateWallet({ documentId: wallet.documentId, data: commonData }).unwrap();
        toast.success('Đã cập nhật ví.');
      } else {
        await createWallet(commonData).unwrap();
        toast.success('Đã tạo ví mới.');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Sửa ví' : 'Tạo Ví Mới'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Cập nhật thông tin ví của bạn.' : 'Tạo một ví mới để theo dõi số dư.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="wallet-name">Tên ví *</Label>
          <Input
            id="wallet-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Ví tiền mặt"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Loại ví / Nguồn tiền *</Label>
          <div className="grid grid-cols-2 gap-2">
            {WALLET_TYPE_ORDER.map((value) => {
              const meta = WALLET_TYPE_META[value];
              const active = type === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn(
                    'flex items-center gap-2 border px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? meta.activeClass : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  <meta.icon className="size-4" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wallet-balance">Số dư ban đầu (đ) *</Label>
          <Input
            id="wallet-balance"
            inputMode="numeric"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wallet-account-number">Số tài khoản / Số thẻ (Tùy chọn)</Label>
          <Input
            id="wallet-account-number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Ví dụ: 0123456789"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wallet-note">Ghi chú (Tùy chọn)</Label>
          <Input
            id="wallet-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú thêm về ví này"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Xác Nhận Tạo Ví'}
        </Button>
      </DialogFooter>
    </form>
  );
}
