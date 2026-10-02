"use client";

import { useState, type ChangeEvent, type ComponentProps } from "react";
import { formatPhoneInput, phoneDigits } from "@/src/lib/format/phone";
import { Input } from "@/src/ui/primitives/Input";

type Props = Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange" | "defaultValue"> & {
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

/**
 * Türkiye telefon girişi: yazarken "0 (5xx) xxx xx xx" biçimine sokar. Form bu görünen değeri gönderir;
 * backend'e gidecek "+90..." biçimine şema/server action normalleştirir (bkz. lib/format/phone.ts).
 */
export function PhoneInput({ defaultValue = "", onChange, placeholder = "0 (5xx) xxx xx xx", ...props }: Props) {
  const [value, setValue] = useState(() => formatPhoneInput(defaultValue));

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    // Biçim karakteri silindiyse ("0 (532) " → ")" silindi) rakam değişmez; kullanıcı bir hane silmek istemiştir.
    const deletedFormatChar = raw.length < value.length && phoneDigits(raw) === phoneDigits(value);
    const digits = deletedFormatChar ? phoneDigits(value).slice(0, -1) : phoneDigits(raw);
    setValue(digits ? formatPhoneInput(digits) : "");
    onChange?.(event);
  }

  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete={props.autoComplete ?? "tel-national"}
      maxLength={17}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
    />
  );
}
