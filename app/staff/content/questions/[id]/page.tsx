"use client";
import { QuestionEditorPage } from "@/src/features/authoring/questions/QuestionEditor";
import { use } from "react";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <QuestionEditorPage basePath="/staff/content/questions" versionId={id} />;
}
