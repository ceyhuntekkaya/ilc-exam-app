export function companyStatusLabel(status?: string | null): string {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "SUSPENDED":
      return "Askıda";
    case "PASSIVE":
      return "Pasif";
    default:
      return status ?? "—";
  }
}

export function companyStatusTone(
  status?: string | null,
): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "SUSPENDED":
      return "warning";
    case "PASSIVE":
      return "danger";
    default:
      return "neutral";
  }
}

export function subscriptionStatusLabel(status?: string | null): string {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "EXPIRED":
      return "Süresi dolmuş";
    case "CANCELLED":
      return "İptal";
    default:
      return status ?? "—";
  }
}

export function userStatusLabel(status?: string | null): string {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "PASSIVE":
      return "Pasif";
    case "LOCKED":
      return "Kilitli";
    default:
      return status ?? "—";
  }
}

export function examStatusLabel(status?: string | null): string {
  switch (status) {
    case "DRAFT":
      return "Taslak";
    case "IN_REVIEW":
      return "İncelemede";
    case "PUBLISHED":
      return "Yayında";
    case "ARCHIVED":
      return "Arşiv";
    default:
      return status ?? "—";
  }
}

export function assignmentStatusLabel(status?: string | null): string {
  switch (status) {
    case "DRAFT":
      return "Taslak";
    case "OPEN":
      return "Açık";
    case "CLOSED":
      return "Kapalı";
    default:
      return status ?? "—";
  }
}

export function yearStatusLabel(status?: string | null): string {
  switch (status) {
    case "DRAFT":
      return "Taslak";
    case "ACTIVE":
      return "Aktif";
    case "READ_ONLY":
      return "Salt okunur";
    case "ARCHIVED":
      return "Arşiv";
    default:
      return status ?? "—";
  }
}
