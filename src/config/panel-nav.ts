import { hasAnyPermission, Perm } from "@/src/lib/permissions";

export type PanelNavItem = {
  href: string;
  label: string;
  description?: string;
  /** Bu izinlerden herhangi biri yeterli. Boşsa herkese görünür. */
  perms?: string[];
};

export type PanelNavGroup = {
  label: string;
  items: PanelNavItem[];
};

/** PanelChrome hâlâ bu adı kullanır. */
export type NavGroup = PanelNavGroup;
export type NavItem = PanelNavItem;

type ContentDef = {
  slug: string;
  label: string;
  description: string;
  perms: string[];
};

const CONTENT: ContentDef[] = [
  {
    slug: "questions",
    label: "Soru Bankası",
    description: "Soru yaz, düzenle, bankada ara",
    perms: [Perm.questionCreate, Perm.questionEditOwn, Perm.questionEditAll, Perm.examRead],
  },
  {
    slug: "exams",
    label: "Sınavlar",
    description: "Sınav kur ve yayınla",
    perms: [Perm.examRead],
  },
  {
    slug: "review",
    label: "İnceleme Kuyruğu",
    description: "Soruları ve sınavları incele",
    perms: [Perm.contentReviewManage, Perm.questionEditOwn, Perm.questionEditAll],
  },
  {
    slug: "media",
    label: "Medya",
    description: "Görsel ve ses kütüphanesi",
    perms: [Perm.mediaManage],
  },
  {
    slug: "rubrics",
    label: "Rubrikler",
    description: "Yazma ve konuşma rubrikleri",
    perms: [Perm.rubricManage, Perm.examRead],
  },
  {
    slug: "formats",
    label: "Sınav Formatları",
    description: "Hazır sınav iskeletleri",
    perms: [Perm.examFormatManage, Perm.examRead],
  },
  {
    slug: "settings",
    label: "Ayarlar",
    description: "Etiket, kazanım ve yaş bantları",
    perms: [Perm.dictionaryManage, Perm.examRead],
  },
];

export function contentNavItems(prefix: "/admin" | "/staff"): PanelNavItem[] {
  return CONTENT.map((item) => ({
    href: `${prefix}/content/${item.slug}`,
    label: item.label,
    description: item.description,
    perms: prefix === "/staff" ? item.perms : undefined,
  }));
}

export function adminNavGroups(): PanelNavGroup[] {
  return [
    { label: "Genel", items: [{ href: "/admin", label: "Özet" }] },
    {
      label: "Kurum yönetimi",
      items: [
        { href: "/admin/companies", label: "Kurumlar" },
        { href: "/admin/exams", label: "Lisanslar" },
      ],
    },
    { label: "Sınav yönetimi", items: contentNavItems("/admin") },
  ];
}

export function staffNavGroups(): PanelNavGroup[] {
  return [
    { label: "Genel", items: [{ href: "/staff", label: "Panel" }] },
    { label: "İçerik", items: contentNavItems("/staff") },
    {
      label: "Sınav Uygulama",
      items: [
        {
          href: "/staff/exams",
          label: "Lisanslı Sınavlar",
          description: "Kuruma tanınan sınav hakları",
          perms: [Perm.assignmentManage, Perm.examGrantManage],
        },
        {
          href: "/staff/exams/assignments",
          label: "Atamalar",
          description: "Sınıfa ata, aç, kapat, izle",
          perms: [Perm.assignmentManage, Perm.assignmentMonitor],
        },
        {
          href: "/staff/grading",
          label: "Değerlendirme",
          description: "Açık uçlu cevapları puanla",
          perms: [Perm.assignmentEvaluate],
        },
      ],
    },
    {
      label: "Sonuçlar",
      items: [
        {
          href: "/staff/results",
          label: "Sınav Sonuçları",
          description: "Yayınlanan sonuçları takip et",
          perms: [Perm.reportViewBranch, Perm.reportViewInstitute, Perm.reportViewCompany],
        },
        {
          href: "/staff/reports",
          label: "Raporlar",
          description: "Şube, kampüs ve kurum raporları",
          perms: [Perm.reportViewBranch, Perm.reportViewInstitute, Perm.reportViewCompany],
        },
      ],
    },
    {
      label: "İnsanlar",
      items: [
        {
          href: "/staff/students",
          label: "Öğrenciler",
          description: "Öğrenci ekle, güncelle, kaydet",
          perms: [Perm.studentViewProfile, Perm.studentManage],
        },
        {
          href: "/staff/personnel",
          label: "Personel",
          description: "Kullanıcı ekle, rol ve kapsam ata",
          perms: [Perm.staffAssignScope],
        },
      ],
    },
    {
      label: "Kurum",
      items: [
        {
          href: "/staff/company",
          label: "Kurum Ayarları",
          description: "Kampüs, sezon, seviye ve sınıflar",
          perms: [Perm.companyManage],
        },
        {
          href: "/staff/roles",
          label: "Roller ve Yetkiler",
          description: "Kurum rol şablonlarını düzenle",
          perms: [Perm.staffManageRoles],
        },
      ],
    },
  ];
}

export function visibleNav(
  role: "SUPER_ADMIN" | "STAFF",
  permissions?: readonly string[],
): PanelNavGroup[] {
  const groups = role === "STAFF" ? staffNavGroups() : adminNavGroups();
  if (role !== "STAFF") return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasAnyPermission(permissions, item.perms)),
    }))
    .filter((group) => group.items.length > 0);
}

function pathMatchesHref(pathname: string, href: string): boolean {
  if (href === "/staff" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function matchingNavItem(
  pathname: string,
  groups: PanelNavGroup[],
): PanelNavItem | undefined {
  return groups
    .flatMap((group) => group.items)
    .filter((item) => pathMatchesHref(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function isNavActive(pathname: string, href: string, groups: PanelNavGroup[]): boolean {
  return matchingNavItem(pathname, groups)?.href === href;
}
