export const adminNav: NavGroup[] = [
  {
    label: "Genel",
    items: [{ href: "/admin", label: "Özet" }],
  },
  {
    label: "Kurum yönetimi",
    items: [
      { href: "/admin/companies", label: "Kurumlar" },
      { href: "/admin/exams", label: "Sınavlar" },
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
