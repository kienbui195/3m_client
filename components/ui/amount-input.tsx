"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

const ALLOWED_CONTROL_KEYS = [
  "Backspace",
  "Delete",
  "Tab",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]

function formatWithThousands(raw: string) {
  if (!raw) return ""
  return Number(raw).toLocaleString("en-US")
}

interface AmountInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode"> {
  // Luôn là chuỗi số nguyên dương thuần (không dấu phẩy) - component tự lo
  // format hiển thị, chỉ cần onChange trả về giá trị sạch để cha dùng trực
  // tiếp `Number(value)` mà không cần tự strip dấu phẩy nữa.
  value: string
  onChange: (rawValue: string) => void
}

// Input cho số tiền dùng chung (giao dịch, số dư ví, hạn mức ngân sách...) -
// chặn nhập chữ/dấu trừ ngay từ bàn phím, và tự format dấu phẩy ngăn cách
// hàng nghìn khi mất focus (giữ nguyên số thô lúc đang gõ để không nhảy con trỏ).
function AmountInput({ value, onChange, onFocus, onBlur, onKeyDown, ...props }: AmountInputProps) {
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={isFocused ? value : formatWithThousands(value)}
      onFocus={(e) => {
        setIsFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setIsFocused(false)
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (!ALLOWED_CONTROL_KEYS.includes(e.key) && !e.ctrlKey && !e.metaKey && !/^[0-9]$/.test(e.key)) {
          e.preventDefault()
        }
        onKeyDown?.(e)
      }}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
    />
  )
}

export { AmountInput }
