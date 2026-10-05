import { hasAnyPermission, Perm } from "@/src/lib/permissions";

export type StaffNavItem = {
  href: string;
  label: string;
  description?: string;
  /** Bu izinlerden herhangi biri yeterli. Boşsa her STAFF kullanıcısına görünür. */
  perms?: string[];
};

export type StaffNavGroup = {
  label: string;
  items: StaffNavItem[];
};

export const staffNav: StaffNavGroup[] = [
  {
    label: "Genel",
    items: [{ href: "/staff", label: "Panel" }],
  },
  {
    label: "İçerik",
    items: [
      {
        href: "/staff/content/questions",
        label: "Soru Bankası",
        description: "Soru yaz, düzenle, bankada ara",
        perms: [Perm.questionCreate, Perm.questionEditOwn, Perm.questionEditAll, Perm.examRead],
      },
      {
        href: "/staff/content/exams",
        label: "Sınavlar",
        description: "Sınav kur ve yayınla",
        perms: [Perm.examRead],
      },
      {
        href: "/staff/content/review",
        label: "İnceleme Kuyruğu",
        description: "Soruları ve sınavları incele",
        perms: [Perm.contentReviewManage, Perm.questionEditOwn, Perm.questionEditAll],
      },
      {
        href: "/staff/content/media",
        label: "Medya",
        description: "Görsel ve ses kütüphanesi",
        perms: [Perm.mediaManage],
      },
      {
        href: "/staff/content/rubrics",
        label: "Rubrikler",
        description: "Yazma ve konuşma rubrikleri",
        perms: [Perm.rubricManage, Perm.examRead],
      },
      {
        href: "/staff/content/formats",
        label: "Sınav Formatları",
        description: "Hazır sınav iskeletleri",
        perms: [Perm.examFormatManage, Perm.examRead],
      },
      {
        href: "/staff/content/settings",
        label: "Kazanım ve Etiketler",
        description: "Etiket, kazanım ve yaş bantları",
        perms: [Perm.dictionaryManage, Perm.examRead],
      },
    ],
  },
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

export function visibleStaffNav(permissions: readonly string[] | undefined): StaffNavGroup[] {
  return staffNav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasAnyPermission(permissions, item.perms)),
    }))
    .filter((group) => group.items.length > 0);
}

function pathMatchesHref(pathname: string, href: string): boolean {
  if (href === "/staff") return pathname === "/staff";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** En uzun eşleşen menü maddesi — `/staff/exams/assignments` lisansı değil atamayı seçer. */
export function matchingStaffNavItem(pathname: string): StaffNavItem | undefined {
  return staffNav
    .flatMap((group) => group.items)
    .filter((item) => pathMatchesHref(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function isStaffNavActive(pathname: string, href: string): boolean {
  return matchingStaffNavItem(pathname)?.href === href;
}
