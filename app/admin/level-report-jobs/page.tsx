"use client";

import { LevelReportJobsSection } from "@/src/features/reports/LevelReportJobsSection";
import { PageHeader } from "@/src/ui";

export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Seviye raporu işleri" description="Seviye raporu üretim kuyruğu: ölü mektupları izleyin ve yeniden kuyruğa alın (yalnız merkez)." />
      <LevelReportJobsSection />
    </div>
  );
}
