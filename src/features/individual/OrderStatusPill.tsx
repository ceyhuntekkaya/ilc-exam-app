import { entitlementStatusLabel, entitlementStatusTone, orderStatusLabel, orderStatusTone, type BadgeTone } from "@/src/features/individual/commerceModel";
import { StatusPill, type KidTone } from "@/src/features/student/ui";

const KID_TONE: Record<BadgeTone, KidTone> = {
  neutral: "neutral",
  success: "mint",
  warning: "sun",
  danger: "coral",
  info: "sky",
};

export function OrderStatusPill({ status }: { status?: string | null }) {
  return <StatusPill tone={KID_TONE[orderStatusTone(status)]}>{orderStatusLabel(status)}</StatusPill>;
}

export function EntitlementPill({ status }: { status?: string | null }) {
  return <StatusPill tone={KID_TONE[entitlementStatusTone(status)]}>{entitlementStatusLabel(status)}</StatusPill>;
}
