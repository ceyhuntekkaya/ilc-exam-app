export const adminNav: NavGroup[] = [
  {
    label: "Genel",
    items: [{ href: "/admin", label: "Özet" }],
  },
  {
    label: "Kurum yönetimi",
    items: [
      { href: "/admin/companies", label: "Kurumlar" },
      { href: "/admin/exams", label: "Dağıtım (grant)" },
    ],
  },
  {
    label: "Sınav yönetimi",
    items: [
      { href: "/admin/content/questions", label: "Soru Bankası" },
      { href: "/admin/content/exams", label: "Sınavlar" },
      { href: "/admin/content/review", label: "İnceleme Kuyruğu" },
      { href: "/admin/content/media", label: "Medya" },
      { href: "/admin/content/rubrics", label: "Rubrikler" },
      { href: "/admin/content/formats", label: "Sınav Formatları" },
      { href: "/admin/content/settings", label: "Ayarlar" },
    ],
  },
];

export type NavItem = {
  href: string;
  label: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};
