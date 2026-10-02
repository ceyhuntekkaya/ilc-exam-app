import { AuthoringFrame } from "@/src/features/authoring/shared/AuthoringFrame";

export default function StaffContentLayout({ children }: { children: React.ReactNode }) {
  return <AuthoringFrame>{children}</AuthoringFrame>;
}
