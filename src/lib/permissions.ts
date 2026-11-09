/** Backend `PermissionCodes` ile aynı atomik kodlar. */
export const Perm = {
  examCreate: "exam:create",
  examPublish: "exam:publish",
  examRead: "exam:read",
  assignmentManage: "assignment:manage",
  assignmentMonitor: "assignment:monitor",
  assignmentEvaluate: "assignment:evaluate",
  examGrantManage: "exam_grant:manage",
  questionCreate: "question:create",
  questionEditOwn: "question:edit_own",
  questionEditAll: "question:edit_all",
  reportViewBranch: "report:view_branch",
  reportViewInstitute: "report:view_institute",
  reportViewCompany: "report:view_company",
  studentViewProfile: "student:view_profile",
  studentManage: "student:manage",
  staffAssignScope: "staff:assign_scope",
  staffManageRoles: "staff:manage_roles",
  companyManage: "company:manage",
  mediaManage: "media:manage",
  rubricManage: "rubric:manage",
  dictionaryManage: "dictionary:manage",
  examFormatManage: "exam_format:manage",
  contentReviewManage: "content_review:manage",
  psychometricsManage: "psychometrics:manage",
  /** Muhasebe: ödeme onayı/iadesi/ölü mektup (backend `PermissionCodes.CENTER_MANAGE`). */
  centerManage: "center:manage",
  /** Sertifika basımı, iptal ve iptal+yeniden basım (backend `PermissionCodes.CERTIFICATE_MANAGE`, R-22; yalnız merkez rolleri). */
  certificateManage: "certificate:manage",
} as const;

export type PermissionCode = (typeof Perm)[keyof typeof Perm];

export function hasAnyPermission(
  owned: readonly string[] | undefined,
  required: readonly string[] | undefined,
): boolean {
  if (!required || required.length === 0) return true;
  if (!owned || owned.length === 0) return false;
  const set = new Set(owned);
  return required.some((code) => set.has(code));
}
