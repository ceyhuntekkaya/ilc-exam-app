import { AuthoringFrame } from "@/src/features/authoring/shared/AuthoringFrame";

export default function AdminContentLayout({ children }: { children: React.ReactNode }) {
  return <AuthoringFrame>{children}</AuthoringFrame>;
}
