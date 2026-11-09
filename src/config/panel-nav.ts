import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import { hasAnyPermission, Perm } from "@/src/lib/permissions";

export type PanelNavItem = {
  href: string;
  label: string;
  description?: string;
  /** Bu izinlerden herhangi biri yeterli. Boşsa herkese görünür. */
  perms?: string[];
  /** Menüde gösterme; rota yetki kontrolü için durur. */
  hidden?: boolean;
  /** Yalnız merkez (ILC Content) personeline görünür; izin kodu olmayan panelist ekranı için. */
  centralOnly?: boolean;
};

/** Menü/rota kapısı: izin + (varsa) merkez personeli koşulu. Süper Admin menüsü süzülmez. */
export function navItemAllowed(
  item: Pick<PanelNavItem, "perms" | "centralOnly">,
  permissions?: readonly string[],
  companyId?: string | null,
): boolean {
  if (item.centralOnly && companyId !== HQ_CONTENT_ORG_ID) return false;
  return hasAnyPermission(permissions, item.perms);
}

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
  /** Yalnız personel panelinde (izin kodu olmayan panelist ekranı). */
  staffOnly?: boolean;
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
    slug: "blueprints",
    label: "Blueprint'ler",
    description: "Form üretimi için boyut/tolerans şablonları",
    perms: [Perm.questionCreate, Perm.questionEditOwn, Perm.questionEditAll, Perm.examRead],
  },
  {
    slug: "formats",
    label: "Sınav Formatları",
    description: "Hazır sınav iskeletleri",
    perms: [Perm.examFormatManage, Perm.examRead],
  },
  {
    slug: "ctt",
    label: "CTT Paneli",
    description: "Madde güçlüğü, ayırt edicilik ve form güvenirliği",
    perms: [Perm.psychometricsManage],
  },
  {
    slug: "dif",
    label: "DIF Paneli",
    description: "Madde yanlılığı: yaş bandı, ana dil, kurum türü",
    perms: [Perm.psychometricsManage],
  },
  {
    slug: "anchor-sets",
    label: "Anchor Setleri",
    description: "Kalibrasyon bağlayıcı maddeleri: oluştur, incele, onayla",
    perms: [Perm.psychometricsManage],
  },
  {
    slug: "standard-setting",
    label: "Standart Belirleme",
    description: "Angoff/Bookmark çalışmaları, panelistler ve kesme puanları",
    perms: [Perm.psychometricsManage],
  },
  {
    slug: "panelist",
    label: "Panelist Çalışmalarım",
    description: "Atandığım standart belirleme çalışmaları",
    perms: [],
    staffOnly: true,
  },
  {
    slug: "outcome-tree",
    label: "Kazanım Ağacı",
    description: "Kazanım hiyerarşisi ve merkezî çerçeve eşlemesi",
    perms: [Perm.examRead, Perm.dictionaryManage],
  },
  {
    slug: "settings",
    label: "Ayarlar",
    description: "Etiket, kazanım ve yaş bantları",
    perms: [Perm.dictionaryManage, Perm.examRead],
  },
];

export function contentNavItems(prefix: "/admin" | "/staff"): PanelNavItem[] {
  return CONTENT.filter((item) => prefix === "/staff" || !item.staffOnly).map((item) => ({
    href: `${prefix}/content/${item.slug}`,
    label: item.label,
    description: item.description,
    perms:
      prefix === "/staff"
        ? item.slug === "exams"
          ? [...item.perms, Perm.assignmentManage, Perm.examGrantManage]
          : item.perms.length > 0
            ? item.perms
            : undefined
        : undefined,
    hidden: prefix === "/staff" && item.slug === "review",
    centralOnly: prefix === "/staff" && item.staffOnly ? true : undefined,
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
        { href: "/admin/consent-texts", label: "Rıza metinleri" },
      ],
    },
    {
      label: "Ürün ve politika",
      items: [
        { href: "/admin/policy-bundles", label: "Politika demetleri" },
        { href: "/admin/skus", label: "Ürün kataloğu (SKU)" },
        { href: "/admin/packages", label: "Paketler ve haklar" },
        { href: "/admin/payments", label: "Ödeme onayı", description: "Havale siparişleri, onay, iade, ölü mektup" },
      ],
    },
    { label: "Sınav yönetimi", items: contentNavItems("/admin") },
    {
      label: "Raporlar",
      items: [
        {
          href: "/admin/reports",
          label: "Merkez Raporu",
          description: "AI-insan uyumu, gözetimli pay",
          perms: [Perm.psychometricsManage],
        },
      ],
    },
  ];
}

export function staffNavGroups(): PanelNavGroup[] {
  const content = contentNavItems("/staff");
  const settings = content.find((item) => item.href.endsWith("/content/settings"));
  return [
    { label: "Genel", items: [{ href: "/staff", label: "Panel" }] },
    { label: "İçerik", items: content.filter((item) => item.href !== settings?.href) },
    {
      label: "Sınav Uygulama",
      items: [
        {
          href: "/staff/exams",
          label: "Lisanslı Sınavlar",
          description: "Kuruma tanınan sınav hakları",
          perms: [Perm.assignmentManage, Perm.examGrantManage],
          hidden: true,
        },
        {
          href: "/staff/exams/assignments",
          label: "Atamalar",
          description: "Sınıfa ata, aç, kapat, izle",
          perms: [Perm.assignmentManage, Perm.assignmentMonitor],
          // F3B-17 / R-10: dağıtım ekranları (oluşturma sihirbazı dahil) eski atama motorunun yerine geçti. `src/features/assignments/**`
          // SİLİNMEDİ (dokunulmaz), yalnız menüden kaldırıldı — rota hâlâ erişilebilir.
          hidden: true,
        },
        {
          href: "/staff/distributions",
          label: "Dağıtımlar",
          description: "Dağıtım oluştur, hedefle, aç; adayları ve sonuçları izle",
          perms: [Perm.assignmentManage, Perm.assignmentMonitor],
        },
        {
          href: "/staff/grading",
          label: "Değerlendirme",
          description: "Açık uçlu cevapları puanla",
          perms: [Perm.assignmentEvaluate],
        },

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
        {
          href: "/staff/reports/classroom",
          label: "Sınıf Isı Haritası",
          description: "Kazanım bazlı zorlanma — yüzde ve madde sayısı",
          perms: [Perm.reportViewBranch, Perm.reportViewInstitute, Perm.reportViewCompany],
        },
        {
          href: "/staff/reports/institution",
          label: "Seviye Raporu — Kurum",
          description: "Kohort dağılımı, güvence seviyesi kırılımı",
          perms: [Perm.reportViewInstitute, Perm.reportViewCompany],
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
          href: "/staff/students/bulk-import",
          label: "Toplu Öğrenci Yükleme",
          description: "CSV ile birden çok öğrenci hesabı tek seferde oluştur",
          perms: [Perm.studentManage],
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
      label: "Muhasebe",
      items: [
        {
          href: "/staff/payments",
          label: "Ödeme onayı",
          description: "Havale siparişleri, onay, iade, ölü mektup",
          perms: [Perm.centerManage],
        },
      ],
    },
    {
      label: "Kurum",
      items: [
        ...(settings ? [settings] : []),
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
        {
          href: "/staff/institution-declarations",
          label: "Kurum Beyanı",
          description: "Reşit olmayan öğrenciler için rıza beyanı (D66)",
          perms: [Perm.studentManage],
        },
        {
          href: "/staff/ledger",
          label: "Kota ve Tüketim",
          description: "Kota bakiyesi, defter hareketleri ve tüketim raporu",
          perms: [Perm.reportViewBranch, Perm.reportViewInstitute, Perm.reportViewCompany],
        },
      ],
    },
  ];
}

export function visibleNav(
  role: "SUPER_ADMIN" | "STAFF",
  permissions?: readonly string[],
  companyId?: string | null,
): PanelNavGroup[] {
  const groups = role === "STAFF" ? staffNavGroups() : adminNavGroups();
  if (role !== "STAFF") return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.hidden && navItemAllowed(item, permissions, companyId)),
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
