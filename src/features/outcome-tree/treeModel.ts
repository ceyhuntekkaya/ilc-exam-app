import type { MapRequest, OutcomeNode } from "@/src/api/generated/models";

export const FRAMEWORK_LABEL: Record<string, string> = { MEB: "MEB", CEFR: "CEFR", ILC: "ILC" };

export const MAPPING_TYPE_LABEL: Record<string, string> = {
  EXACT: "Tam eşleşme",
  BROADER: "Merkez kazanım daha geniş",
  NARROWER: "Merkez kazanım daha dar",
  RELATED: "İlişkili",
};

export function flattenTree(nodes: readonly OutcomeNode[]): OutcomeNode[] {
  const out: OutcomeNode[] = [];
  const walk = (list: readonly OutcomeNode[], seen: Set<string>) => {
    for (const node of list) {
      if (node.id && seen.has(node.id)) continue; // bozuk veride döngüye girme
      if (node.id) seen.add(node.id);
      out.push(node);
      walk(node.children ?? [], seen);
    }
  };
  walk(nodes, new Set());
  return out;
}

/** Düğümün kendisi + tüm torunlarının kimlikleri (üst atama döngüsünü önlemek için). */
export function subtreeIds(node: OutcomeNode): Set<string> {
  return new Set(flattenTree([node]).map((n) => n.id!).filter(Boolean));
}

/**
 * Üst kazanım adayları: aynı çerçeveden, kendisi ve torunları HARİÇ (döngü olur). Backend de reddeder (döngü, çerçeve farkı);
 * bu liste yalnız yanlış seçeneği hiç sunmamak içindir.
 */
export function parentCandidates(tree: readonly OutcomeNode[], node: OutcomeNode): OutcomeNode[] {
  const banned = subtreeIds(node);
  return flattenTree(tree).filter((n) => n.id && !banned.has(n.id) && n.framework === node.framework);
}

/** Kod/metin süzgeci: eşleşen düğüm ya da eşleşen torunu olan düğümler kalır (yol görünür). */
export function filterTree(nodes: readonly OutcomeNode[], query: string): OutcomeNode[] {
  const needle = query.trim().toLocaleLowerCase("tr");
  if (!needle) return [...nodes];
  const walk = (list: readonly OutcomeNode[]): OutcomeNode[] =>
    list.flatMap((node) => {
      const kids = walk(node.children ?? []);
      const hit = `${node.code ?? ""} ${node.description ?? ""}`.toLocaleLowerCase("tr").includes(needle);
      if (!hit && kids.length === 0) return [];
      return [{ ...node, children: hit ? (node.children ?? []) : kids }];
    });
  return walk(nodes);
}

export function nodeLabel(node: Pick<OutcomeNode, "code" | "description">): string {
  return node.description ? `${node.code} — ${node.description}` : (node.code ?? "—");
}

export type MappingFormState = { targetOutcomeId: string; mappingType: string; confidence: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateMappingForm(form: MappingFormState): Partial<Record<keyof MappingFormState, string>> {
  const errors: Partial<Record<keyof MappingFormState, string>> = {};
  if (!UUID_RE.test(form.targetOutcomeId.trim())) errors.targetOutcomeId = "Merkez kazanımın kimliğini (UUID) girin";
  if (!form.mappingType) errors.mappingType = "Eşleme türü seçin";
  const text = form.confidence.trim().replace(",", ".");
  if (text !== "") {
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0 || value > 1) errors.confidence = "Güven 0 ile 1 arasında olmalı";
  }
  return errors;
}

export function toMapRequest(form: MappingFormState): MapRequest {
  const text = form.confidence.trim().replace(",", ".");
  return {
    targetOutcomeId: form.targetOutcomeId.trim(),
    mappingType: form.mappingType as MapRequest["mappingType"],
    ...(text !== "" ? { confidence: Number(text) } : {}),
  };
}
