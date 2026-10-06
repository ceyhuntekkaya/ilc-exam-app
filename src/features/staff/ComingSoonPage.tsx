import { ButtonLink, EmptyState, PageHeader } from "@/src/ui";

/** Henüz açılmamış staff ekranı: başlık + ne geleceğini ve şimdilik nereye bakılacağını söyleyen boş durum. */
export function ComingSoonPage({
  title,
  description,
  fallback,
}: {
  title: string;
  description: string;
  /** Şimdilik kullanılabilecek en yakın ekran. */
  fallback?: { href: string; label: string };
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Bu ekran yakında açılacak"
        description="Geliştirme sürüyor. Bu arada ilgili özet bilgilere aşağıdaki ekrandan ulaşabilirsiniz."
        action={
          fallback ? (
            <ButtonLink href={fallback.href} variant="secondary">
              {fallback.label}
            </ButtonLink>
          ) : undefined
        }
      />
    </div>
  );
}
