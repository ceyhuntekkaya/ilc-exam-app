import type { SVGProps } from "react";

/**
 * Header, trust-badge ve kart gibi yerlerde emoji yerine kullanılan
 * sade çizgi ikon seti (24x24, stroke tabanlı, heroicons benzeri).
 * Yeni ikon eklerken aynı `strokeWidth={1.75}` / `viewBox="0 0 24 24"`
 * kalıbını koru.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20.5s-7.5-4.6-9.8-9.3C.6 7.7 2.3 4 6 4c2 0 3.5 1 4 2.3.9-1.3 2-2.3 4-2.3 3.7 0 5.4 3.7 3.8 7.2-2.3 4.7-9.8 9.3-9.8 9.3Z" />
    </svg>
  );
}

export function IconCart(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="21" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="21" r="1.4" fill="currentColor" stroke="none" />
      <path d="M2.5 3h2l2.2 11.3a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.5 7H6" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.5 4.2-5.5 7.5-5.5s6.1 2 7.5 5.5" />
    </svg>
  );
}

export function IconTruck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="6" width="12" height="10" rx="1.5" />
      <path d="M14 10h4.2a1 1 0 0 1 .8.4l2 2.6V16a1 1 0 0 1-1 1h-1" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </svg>
  );
}

export function IconShieldCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 5 6v5.5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6Z" />
      <path d="m9.2 12 1.9 1.9 3.7-3.9" />
    </svg>
  );
}

export function IconCreditCard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 9.5h19" />
      <path d="M6 15h4" />
    </svg>
  );
}

export function IconHeadset(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1.4" />
      <rect x="17" y="13" width="4" height="6" rx="1.4" />
      <path d="M20 19v.5a3 3 0 0 1-3 3h-3" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="11" width="15" height="9.5" rx="1.8" />
      <path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 5 5.1 1.5 1.5 0 0 1 6.5 3.5Z" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconStorefront(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 9.5 5 4h14l1.5 5.5" />
      <path d="M4 9.5v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
      <path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M10 19.5v-5h4v5" />
    </svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15.5V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 3h7l4 4v13a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M13.5 3v4h4" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <rect x="7" y="6" width="3.5" height="12" rx="0.5" />
      <rect x="13.5" y="6" width="3.5" height="12" rx="0.5" />
    </svg>
  );
}

export function IconExpand(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4H4v5" />
      <path d="M15 4h5v5" />
      <path d="M9 20H4v-5" />
      <path d="M15 20h5v-5" />
    </svg>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21.5s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3.5 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7v12.5A1.5 1.5 0 0 0 8 21h8a1.5 1.5 0 0 0 1.5-1.5V7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h3v-5.5h4V20h3a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M15 16.5 20 12l-5-4.5" />
      <path d="M20 12H9.5" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

export function IconBoxes(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 4 6.8v10.4L12 21l8-3.8V6.8Z" />
      <path d="M4 6.8 12 10.5l8-3.7" />
      <path d="M12 10.5V21" />
    </svg>
  );
}

/**
 * `FormTextEditor` araç çubuğu ikonları — hepsi aynı 24x24/stroke-1.75
 * kalıbını (bkz. dosya başındaki `base`) korur.
 */

export function IconEye(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.7C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 4.6-1.2" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

/** Müşteri hesabı sekme menüsü ikonları — aynı 24x24/stroke-1.75 kalıbı. */

export function IconBell(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconMessage(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-5 4Z" />
      <path d="M8 9h8" />
      <path d="M8 12.5h5" />
    </svg>
  );
}

export function IconTicket(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4Z" />
      <path d="M14 6v12" strokeDasharray="2 2" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
    </svg>
  );
}

export function IconQuestion(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconReturn(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

export function IconPackage(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5Z" />
      <path d="m3.5 7.5 8.5 4.5 8.5-4.5" />
      <path d="M12 12v9" />
      <path d="m7.8 5.3 8.4 4.5" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.8M12 19.2V21M4.2 4.2l1.3 1.3M18.5 18.5l1.3 1.3M3 12h1.8M19.2 12H21M4.2 19.8l1.3-1.3M18.5 5.5l1.3-1.3" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5Z" />
    </svg>
  );
}

export function IconMonitor(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

// Zengin metin editörü araç çubuğu ikonları (../dis-sepetim icons.tsx, aynı çizgi kalınlığı ve 24px ızgara).
export function IconBold(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4.5h6a3.5 3.5 0 0 1 0 7H7z" />
      <path d="M7 11.5h6.5a3.5 3.5 0 0 1 0 7H7z" />
    </svg>
  );
}

export function IconItalic(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 4.5h6" />
      <path d="M7 19.5h6" />
      <path d="M14 4.5 10 19.5" />
    </svg>
  );
}

export function IconUnderline(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 4v6.5a6 6 0 0 0 12 0V4" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function IconStrikethrough(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
      <path d="M7.5 7c0-1.9 2-3 4.5-3s4.2 1 4.4 2.6" />
      <path d="M16.6 17.3c-.3 1.6-2.1 2.7-4.4 2.7-2.4 0-4.3-1.1-4.6-3" />
    </svg>
  );
}

export function IconListBullets(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
      <path d="M9.5 6h9" />
      <path d="M9.5 12h9" />
      <path d="M9.5 18h9" />
    </svg>
  );
}

export function IconListNumbers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 6h9" />
      <path d="M9.5 12h9" />
      <path d="M9.5 18h9" />
      <path d="M4.5 5.5h1v3" />
      <path d="M4 17.5h2l-2 2.2h2" />
      <path d="M4.2 11.5h1.6v1.4h-1v1.4h1.6" />
    </svg>
  );
}

export function IconAlignLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 6h15" />
      <path d="M4.5 12h9" />
      <path d="M4.5 18h12" />
    </svg>
  );
}

export function IconAlignCenter(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 6h15" />
      <path d="M7.5 12h9" />
      <path d="M6 18h12" />
    </svg>
  );
}

export function IconAlignRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 6h15" />
      <path d="M10.5 12h9" />
      <path d="M7.5 18h12" />
    </svg>
  );
}

export function IconLink(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 13 4.5a3.2 3.2 0 0 1 4.5 4.5L15.5 11" />
      <path d="M13 17.5 11 19.5a3.2 3.2 0 0 1-4.5-4.5L8.5 13" />
    </svg>
  );
}

export function IconQuote(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 8.5a2.5 2.5 0 0 0-2.5 2.5V15h4v-4H6.6c.1-1.1.9-2 2-2.1Z" fill="currentColor" stroke="none" />
      <path d="M16 8.5a2.5 2.5 0 0 0-2.5 2.5V15h4v-4h-1.9c.1-1.1.9-2 2-2.1Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMinus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconUndo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 8.5H5V5.5" />
      <path d="M5 8.5c1.5-2.3 4-3.5 6.5-3.5a7 7 0 1 1-6.6 9.3" />
    </svg>
  );
}

export function IconRedo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M16 8.5h3V5.5" />
      <path d="M19 8.5c-1.5-2.3-4-3.5-6.5-3.5a7 7 0 1 0 6.6 9.3" />
    </svg>
  );
}

export function IconEraser(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m17.5 6.5-8 8L6 11l8-8Z" />
      <path d="M9.5 14.5 6.5 17.5H4l-1.5-1.5 3-3" />
      <path d="M9.5 17.5h9" />
    </svg>
  );
}

export function IconChevronUp(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

/** Sıralama: öğeyi yukarı taşı. */
export function IconArrowUp(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

/** Sıralama: öğeyi aşağı taşı. */
export function IconArrowDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconMic(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6.5" width="13" height="11" rx="2.5" />
      <path d="m16 10.5 5-3v9l-5-3" />
    </svg>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" />
    </svg>
  );
}

/** Bölümler / katmanlar. */
export function IconLayers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 11a8 8 0 0 0-14.5-4.5M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5M20 20v-4h-4" />
    </svg>
  );
}
