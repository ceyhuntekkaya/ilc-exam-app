"use client";

import { useSyncExternalStore } from "react";

/**
 * Sınav oynatıcısı ile sınav sayfası arasındaki ortak durum (öğrenci akışı):
 * - Aynı anda tek medya: bir ses/video çalarken diğerleri ve soru geçişi kilitli.
 * - Kaydedilmemiş cevaplar (Writing): geçişte "kaydet / vazgeç" sorulur.
 * Admin önizlemesi bu kilitleri kullanmaz (bileşenler `preview` iken kaydolmaz).
 */
type GuardState = {
  /** Çalan medyanın kimliği (null = sessiz). */
  activeMedia: string | null;
  /** Kaydedilmemiş cevabı olan alanlar → kaydetme fonksiyonu. */
  unsaved: ReadonlyMap<string, () => void>;
};

let state: GuardState = { activeMedia: null, unsaved: new Map() };
const listeners = new Set<() => void>();

function emit(next: GuardState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const SERVER_STATE: GuardState = { activeMedia: null, unsaved: new Map() };
const getServerSnapshot = () => SERVER_STATE;

export function usePlayerGuard() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Medya başlarken çağrılır; başka medya çalıyorsa false döner (başlatma). */
export function claimMedia(id: string): boolean {
  if (state.activeMedia && state.activeMedia !== id) return false;
  if (state.activeMedia !== id) emit({ ...state, activeMedia: id });
  return true;
}

/** Ses/video çalıyor ya da kayıt sürüyor mu (tam ekran beklenen çıkış penceresi bu sırada dolmaz). */
export function isMediaActive() {
  return state.activeMedia != null;
}

export function releaseMedia(id: string) {
  if (state.activeMedia === id) emit({ ...state, activeMedia: null });
}

export function setUnsaved(id: string, save: (() => void) | null) {
  const has = state.unsaved.has(id);
  if (!save && !has) return;
  const next = new Map(state.unsaved);
  if (save) next.set(id, save);
  else next.delete(id);
  emit({ ...state, unsaved: next });
}

/** Bekleyen tüm cevapları kaydeder (sınav sayfasındaki "Save and continue"). */
export function saveAllUnsaved() {
  state.unsaved.forEach((save) => save());
}

/** Soru değişince / sayfa kapanınca kalıntı kilitleri temizler. */
export function resetPlayerGuard() {
  if (state.activeMedia || state.unsaved.size) emit({ activeMedia: null, unsaved: new Map() });
}

/*
 * Sonuna kadar izlenen/dinlenen medya. Ses/video seçenekli kartlar (sürükle-bırak, çoktan seçmeli) medya bir kez
 * bitmeden taşınamaz/seçilemez. Oturumda saklanır (soruya geri dönünce / yenilemede yeniden izletmez).
 */
const heard = new Set<string>();
const heardListeners = new Set<() => void>();
let heardVersion = 0;

function heardKey(scope: string | undefined, mediaId: string) {
  return `ilc-heard:${scope ?? "local"}:${mediaId}`;
}

export function markHeard(scope: string | undefined, mediaId: string | null | undefined) {
  if (!mediaId) return;
  const key = heardKey(scope, mediaId);
  if (heard.has(key)) return;
  heard.add(key);
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // depolama kapalıysa yalnız bu sayfa açıkken hatırlanır
  }
  heardVersion += 1;
  heardListeners.forEach((listener) => listener());
}

function isHeard(scope: string | undefined, mediaId: string) {
  const key = heardKey(scope, mediaId);
  if (heard.has(key)) return true;
  try {
    if (sessionStorage.getItem(key) === "1") {
      heard.add(key);
      return true;
    }
  } catch {
    // depolama kapalı
  }
  return false;
}

function subscribeHeard(listener: () => void) {
  heardListeners.add(listener);
  return () => heardListeners.delete(listener);
}

/** Bu medya en az bir kez sonuna kadar oynatıldı mı? (mediaId yoksa true: kilitlenecek bir şey yok) */
export function useHeard(scope: string | undefined, mediaId: string | null | undefined): boolean {
  useSyncExternalStore(subscribeHeard, () => heardVersion, () => 0);
  if (!mediaId) return true;
  return typeof window === "undefined" ? false : isHeard(scope, mediaId);
}
