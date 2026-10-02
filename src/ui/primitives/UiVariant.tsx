"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * default:    panel (admin/satıcı) görünümü.
 * storefront: vitrin görünümü (../dis-sepetim tasarımı).
 * admin:      yönetim paneli — marka tokenlarıyla, kompakt (h-9, text-sm) ve sade kontroller.
 *
 * Layout seviyesinde bir kez verilir; Field, Input ve Button buradan okur. Böylece vitrin formları
 * panel formlarıyla birebir aynı JSX'le yazılır (`<Field label><Input name /></Field>`), sadece görünüm değişir.
 */
export type UiVariant = "default" | "storefront" | "admin";

const UiVariantContext = createContext<UiVariant>("default");

export function UiVariantProvider({ variant, children }: { variant: UiVariant; children: ReactNode }) {
  return <UiVariantContext.Provider value={variant}>{children}</UiVariantContext.Provider>;
}

export function useUiVariant(): UiVariant {
  return useContext(UiVariantContext);
}
