"use client";

import { useParams } from "next/navigation";
import { CredentialsPage } from "@/src/features/standard-setting/CredentialsPage";
import { CutScorePanel } from "@/src/features/standard-setting/CutScorePanel";
import { StandardSettingSubNav } from "@/src/features/standard-setting/SubNav";
import { StudyDetailPage } from "@/src/features/standard-setting/StudyDetailPage";
import { StudyListPage } from "@/src/features/standard-setting/StudyListPage";
import { PsychometricsTabs } from "@/src/features/psychometrics/PsychometricsTabs";
import { PageHeader } from "@/src/ui";

export { CredentialsPage, StudyListPage };

export function StudyDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <StudyDetailPage studyId={id} />;
}

export function CutScoresRoute() {
  return (
    <div className="space-y-4">
      <PageHeader title="Kesme puanları" description="Ölçek sürümüne bağlı kesme önerileri, onay sayıları ve yürürlük durumu." />
      <PsychometricsTabs />
      <StandardSettingSubNav />
      <CutScorePanel />
    </div>
  );
}
