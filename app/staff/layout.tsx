import { StaffShell } from "@/src/components/layouts/staff-shell";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
