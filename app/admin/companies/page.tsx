import { Suspense } from "react";
import AdminCompaniesPage from "./companies-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-neutral-100" />}>
      <AdminCompaniesPage />
    </Suspense>
  );
}
