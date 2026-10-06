/** Tarayıcı metadata'sından ses/video süresi. Oynatılamayan dosyada null. */
export function probeDurationMs(file: File): Promise<number | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith("audio/") ? "audio" : "video");
    const finish = (ms: number | null) => {
      URL.revokeObjectURL(url);
      resolve(ms);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const ms = Number.isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration * 1000) : null;
      finish(ms);
    };
    el.onerror = () => finish(null);
    el.src = url;
  });
}
