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
  return <ExamBuilderPage examId={id} />;
}

export function ReviewQueueRoute() {
  return <ReviewQueuePage />;
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
