import type { DetailTabGroup } from "@/src/ui";

export type CompanySection =
  | "overview"
  | "subscription"
  | "institutes"
  | "years"
  | "grades"
  | "branches"
  | "staff"
  | "students"
  | "grants"
  | "assignments"
  | "reports"
  | "report-cards";

const SECTIONS: { group: string; section: CompanySection; label: string }[] = [
  { group: "Genel", section: "overview", label: "Kurum bilgileri" },
  { group: "Genel", section: "subscription", label: "Üyelik" },
  { group: "Yapı", section: "institutes", label: "Kampüsler" },
  { group: "Yapı", section: "years", label: "Sezonlar" },
  { group: "Yapı", section: "grades", label: "Seviyeler" },
  { group: "Yapı", section: "branches", label: "Sınıflar" },
  { group: "İnsanlar", section: "staff", label: "Personel" },
  { group: "İnsanlar", section: "students", label: "Öğrenciler" },
  { group: "Sınavlar", section: "grants", label: "Lisanslı sınavlar" },
  { group: "Sınavlar", section: "assignments", label: "Sınav atamaları" },
  { group: "Raporlar", section: "reports", label: "Uygulama" },
  { group: "Raporlar", section: "report-cards", label: "Karneler" },
];

export function companyDetailHref(companyId: string, section: CompanySection = "overview") {
  if (section === "overview") return `/admin/companies/${companyId}`;
  return `/admin/companies/${companyId}/${section}`;
}

export function companyDetailNav(companyId: string, current: CompanySection): DetailTabGroup[] {
  const byGroup = new Map<string, { href: string; label: string; current?: boolean }[]>();
  for (const item of SECTIONS) {
    const list = byGroup.get(item.group) ?? [];
    list.push({
      href: companyDetailHref(companyId, item.section),
      label: item.label,
      current: item.section === current,
    });
    byGroup.set(item.group, list);
  }
  return Array.from(byGroup.entries()).map(([group, items]) => ({ group, items }));
}

export function companySectionMeta(section: CompanySection): { group: string; title: string } {
  const found = SECTIONS.find((s) => s.section === section);
  return { group: found?.group ?? "Genel", title: found?.label ?? "Kurum" };
}
