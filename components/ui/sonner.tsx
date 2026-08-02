"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      icons={{
        success: (
          <CheckCircleIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <WarningIcon className="size-4" />
        ),
        error: (
          <XCircleIcon className="size-4" />
        ),
        loading: (
          <SpinnerIcon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          // Phân biệt màu theo loại (mặc định sonner chỉ khác icon, không
          // khác màu) - dùng oklch text/bg đã có sẵn trong globals.css.
          success: "!bg-emerald-50 !text-emerald-900 !border-emerald-200 dark:!bg-emerald-950 dark:!text-emerald-100 dark:!border-emerald-900",
          error: "!bg-red-50 !text-red-900 !border-red-200 dark:!bg-red-950 dark:!text-red-100 dark:!border-red-900",
          warning: "!bg-amber-50 !text-amber-900 !border-amber-200 dark:!bg-amber-950 dark:!text-amber-100 dark:!border-amber-900",
          info: "!bg-blue-50 !text-blue-900 !border-blue-200 dark:!bg-blue-950 dark:!text-blue-100 dark:!border-blue-900",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
