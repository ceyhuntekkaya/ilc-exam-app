"use client";

import { createContext, useContext, type ReactNode } from "react";

export type PlayerPreviewContextValue = {
  /** Authoring / admin preview — no play limits, show answer keys */
  preview: boolean;
};

const PlayerPreviewCtx = createContext<PlayerPreviewContextValue>({ preview: false });

export function PlayerPreviewProvider({
  preview = false,
  children,
}: {
  preview?: boolean;
  children: ReactNode;
}) {
  return (
    <PlayerPreviewCtx.Provider value={{ preview }}>{children}</PlayerPreviewCtx.Provider>
  );
}

export function usePlayerPreview(): PlayerPreviewContextValue {
  return useContext(PlayerPreviewCtx);
}
