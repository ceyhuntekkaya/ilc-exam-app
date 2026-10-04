"use client";

import { useCallback, useState, type DragEvent } from "react";

/**
 * Tablet-friendly select-then-tap placement, with HTML5 drag support as bonus.
 */
export function usePickAndPlace() {
  const [pickedId, setPickedId] = useState<string | null>(null);

  const pick = useCallback((id: string | null) => {
    setPickedId((prev) => (prev === id ? null : id));
  }, []);

  const clear = useCallback(() => setPickedId(null), []);

  return { pickedId, pick, clear, setPickedId };
}

export function dragPayload(e: DragEvent, id: string) {
  e.dataTransfer.setData("text/plain", id);
  e.dataTransfer.effectAllowed = "move";
}

export function dropPayload(e: DragEvent): string | null {
  e.preventDefault();
  const id = e.dataTransfer.getData("text/plain");
  return id || null;
}
