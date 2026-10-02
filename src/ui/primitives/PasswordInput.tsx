"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/src/lib/utils/cn";
import { IconEye, IconEyeOff } from "@/src/ui/icons";
import { Input } from "@/src/ui/primitives/Input";
import { useUiVariant } from "@/src/ui/primitives/UiVariant";
import { useField } from "@/src/ui/primitives/Field";

type Props = Omit<ComponentProps<typeof Input>, "type" | "trailing">;

/** Parola girişi: sağdaki göz butonuyla göster/gizle. Diğer her şey Input ile aynı (Field, variant, ikon, hata). */
export function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);
  const field = useField();
  const uiVariant = useUiVariant();
  const storefront = (props.variant ?? field?.variant ?? uiVariant) === "storefront";
  const invalid = props.invalid ?? field?.invalid ?? false;
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Parolayı gizle" : "Parolayı göster"}
          aria-pressed={visible}
          className={cn(
            "flex size-8 items-center justify-center rounded-md transition-colors",
            storefront
              ? invalid
                ? "text-danger-600 hover:bg-danger-100 dark:text-danger-400 dark:hover:bg-danger-900"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              : "text-fg-subtle hover:bg-bg hover:text-fg",
          )}
        >
          {visible ? <IconEyeOff className="size-4.5" /> : <IconEye className="size-4.5" />}
        </button>
      }
    />
  );
}
