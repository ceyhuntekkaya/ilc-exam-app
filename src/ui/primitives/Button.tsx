"use client";

import { cn } from "@/src/lib/utils/cn";
import { useUiVariant } from "@/src/ui/primitives/UiVariant";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

// danger-solid: her görünümde dolgulu kırmızı (onay diyaloğunun asıl butonu); admin'de danger çerçeveli olduğu için.
type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-solid" | "link";
type Size = "sm" | "md" | "lg";

// "storefront-*": UiVariantProvider storefront iken kullanılan görünümler — ../dis-sepetim button-variants
// (primary; secondary → dis-sepetim "outline"; ghost → dis-sepetim "ghost").
type StorefrontTone = "storefront-primary" | "storefront-secondary" | "storefront-ghost";
const storefrontTones: Partial<Record<Variant, StorefrontTone>> = {
  primary: "storefront-primary",
  secondary: "storefront-secondary",
  ghost: "storefront-ghost",
};

// "admin-*": UiVariantProvider admin iken — kompakt panel butonları; tehlikeli işlem dolgu değil kırmızı çerçeve
// (başlıkta göze batmaz, onay diyaloğundaki asıl buton yine dolgulu).
type AdminTone = "admin-primary" | "admin-secondary" | "admin-ghost" | "admin-danger";
const adminTones: Partial<Record<Variant, AdminTone>> = {
  primary: "admin-primary",
  secondary: "admin-secondary",
  ghost: "admin-ghost",
  danger: "admin-danger",
};

const variants: Record<Variant | StorefrontTone | AdminTone, string> = {
  primary: "rounded-md font-medium bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "rounded-md font-medium border border-border-strong bg-surface text-fg hover:bg-bg",
  ghost: "rounded-md font-medium text-fg hover:bg-bg",
  danger: "rounded-md font-medium bg-danger text-white hover:opacity-90",
  "danger-solid": "rounded-md font-medium bg-danger text-white hover:opacity-90",
  link: "rounded-md font-medium text-primary underline-offset-4 hover:underline px-0",
  "storefront-primary": "rounded-lg bg-primary-600 font-semibold text-white hover:bg-primary-700",
  "storefront-secondary":
    "rounded-lg border border-primary-200 bg-white font-semibold text-primary-700 hover:bg-primary-50 dark:border-primary-900 dark:bg-transparent dark:text-primary-400 dark:hover:bg-primary-950",
  "admin-primary": "rounded-md font-medium bg-primary-600 text-white shadow-xs hover:bg-primary-700",
  "admin-secondary": "rounded-md font-medium border border-border bg-surface text-fg shadow-xs hover:border-border-strong hover:bg-bg",
  "admin-ghost": "rounded-md font-medium text-fg-muted hover:bg-bg hover:text-fg",
  "admin-danger": "rounded-md font-medium border border-danger-200 bg-surface text-danger shadow-xs hover:border-danger-300 hover:bg-danger-bg",
  "storefront-ghost": "rounded-lg font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800",
};

// admin: panel kontrolleriyle (Input admin, h-8) aynı hizada kompakt ölçüler.
const adminSizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-[13px]",
  lg: "h-9 px-3.5 text-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-5 text-base",
};

type ButtonLook = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

function buttonClass(uiVariant: ReturnType<typeof useUiVariant>, { variant = "primary", size = "md", fullWidth = false }: ButtonLook) {
  const tone = (uiVariant === "storefront" && storefrontTones[variant]) || ((uiVariant === "admin" || uiVariant === "staff") && adminTones[variant]) || variant;
  return cn(
    // Köşe ve yazı kalınlığı variant'ta: cn çakışan sınıfları birleştirmediği için base'te tutulmaz.
    "relative inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    variants[tone],
    variant === "link" ? "h-auto" : (uiVariant === "admin" ? adminSizes : sizes)[size],
    uiVariant === "staff" && "min-h-11",
    fullWidth && "w-full",
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonLook & {
    loading?: boolean;
    /** Metnin solunda ikon (ör. "+ Yeni öznitelik"); boyutu butona göre ayarlanır. */
    icon?: ReactNode;
  };

const iconSlot = "shrink-0 [&>svg]:size-4";

export function Button({ variant = "primary", size = "md", loading = false, fullWidth = false, icon, className, children, disabled, ...props }: Props) {
  const uiVariant = useUiVariant();
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass(uiVariant, { variant, size, fullWidth }), className)}
    >
      {icon ? <span aria-hidden className={cn(iconSlot, loading && "invisible")}>{icon}</span> : null}
      <span className={cn(loading && "invisible")}>{children}</span>
      {loading ? <span className="absolute">Kaydediliyor</span> : null}
    </button>
  );
}

/**
 * Buton görünümlü link (sayfa eylemi: "Yeni öznitelik", "Düzenle"). `<Link><Button/></Link>` iç içe etkileşimli öğe
 * oluşturur; bunun yerine tek `<a>` çizilir.
 */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & ButtonLook & { href: string; icon?: ReactNode }) {
  const uiVariant = useUiVariant();
  return (
    <Link href={href} {...props} className={cn(buttonClass(uiVariant, { variant, size, fullWidth }), className)}>
      {icon ? <span aria-hidden className={iconSlot}>{icon}</span> : null}
      <span>{children}</span>
    </Link>
  );
}
