"use client";
import { ExamBuilderPage } from "@/src/features/authoring/exams/ExamPages";
import { use } from "react";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ExamBuilderPage basePath="/staff/content/exams" examId={id} />;
}
