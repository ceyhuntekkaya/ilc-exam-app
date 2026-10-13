"use client";

/**
 * Aynı başvurunun ikinci sekmesi, oturumu düşürmeden önce haber verir.
 * Kuyruk localStorage'da ortaktır; devralan sekme gönderilmemiş cevapları kendi jetonuyla yollar.
 */

let mine: string | null = null;

function myTabId() {
  if (!mine) mine = crypto.randomUUID();
  return mine;
}

function channelName(recipientId: string) {
  return `ilc-exam-tab:${recipientId}`;
}

/** Bu sekmede sınav açıkken diğer sekmelerin yoklamasına cevap verir. Aynı sekme kendini duymaz. */
export function holdExamTab(recipientId: string) {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(channelName(recipientId));
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; id?: string } | null;
    if (data?.type === "ping" && data.id && data.id !== myTabId()) {
      channel.postMessage({ type: "pong", id: myTabId() });
    }
  };
  channel.addEventListener("message", onMessage);
  return () => {
    channel.removeEventListener("message", onMessage);
    channel.close();
  };
}

/** Oturum açmadan önce başka bir sekmenin bu sınavı tutup tutmadığına bakar. */
export function otherTabIsOpen(recipientId: string, timeoutMs = 250): Promise<boolean> {
  if (typeof BroadcastChannel === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const channel = new BroadcastChannel(channelName(recipientId));
    let open = false;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; id?: string } | null;
      if (data?.type === "pong" && data.id && data.id !== myTabId()) open = true;
    };
    channel.addEventListener("message", onMessage);
    channel.postMessage({ type: "ping", id: myTabId() });
    window.setTimeout(() => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      resolve(open);
    }, timeoutMs);
  });
}
