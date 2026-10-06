"use client";

import { ExamBuilderPage, ExamListPage, ExamWizardPage } from "@/src/features/authoring/exams/ExamPages";
import { QuestionEditorPage, QuestionTypePicker } from "@/src/features/authoring/questions/QuestionEditor";
import { QuestionBankPage } from "@/src/features/authoring/questions/QuestionBankPage";
import { RubricsPage } from "@/src/features/authoring/rubrics/RubricEditor";
import {
  FormatsPage,
  MediaLibraryPage,
  ReviewQueuePage,
  SettingsDictionariesPage,
} from "@/src/features/authoring/shared/LibraryPages";
import { useParams } from "next/navigation";
import { Suspense } from "react";

function SearchParamsFallback() {
  return <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />;
}

export function QuestionBankRoute() {
  return <QuestionBankPage />;
}

export function QuestionNewRoute() {
  return <QuestionTypePicker />;
}

export function QuestionEditorRoute() {
  const { id } = useParams<{ id: string }>();
  return <QuestionEditorPage versionId={id} />;
}

export function ExamListRoute() {
  return <ExamListPage />;
}

export function ExamNewRoute() {
  return <ExamWizardPage />;
}

export function ExamBuilderRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<SearchParamsFallback />}>
      <ExamBuilderPage examId={id} />
    </Suspense>
  );
}

export function ReviewQueueRoute() {
  return (
    <Suspense fallback={<SearchParamsFallback />}>
      <ReviewQueuePage />
    </Suspense>
  );
}

export function MediaLibraryRoute() {
  return <MediaLibraryPage />;
}

export function RubricsRoute() {
  return <RubricsPage />;
}

export function FormatsRoute() {
  return <FormatsPage />;
}

export function SettingsRoute() {
  return <SettingsDictionariesPage />;
}
