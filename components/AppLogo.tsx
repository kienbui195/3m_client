import { WalletIcon } from '@phosphor-icons/react';

export function AppLogo() {
  return (
    <div className="mb-8 flex flex-col items-center">
      <div className="relative">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-wide text-primary-foreground">
          3M
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full border-2 border-background bg-amber-400 text-amber-950">
          <WalletIcon className="size-3.5" weight="fill" />
        </div>
      </div>

      <h1 className="mt-4 text-lg font-bold text-foreground">My Money Manager</h1>
      <p className="text-xs text-muted-foreground">Quản lý chi tiêu thông minh</p>
    </div>
  );
}
