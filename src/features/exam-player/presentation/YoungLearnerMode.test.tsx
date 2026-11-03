import { renderWithProviders, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YoungLearnerInstructionAudio } from "./YoungLearnerMode";

/**
 * F3-04/Adım 4: yönerge sesi dokunmadan çalınır (büyük/görsel düğme, `MediaAudio`'nun
 * `variant="default"`+`autoPlay`'i) — jsdom'da `HTMLMediaElement.play` uygulanmadığından
 * burada taklit edilir (bu dosyaya özgü, global `setup.ts`'e eklenmedi).
 */
describe("YoungLearnerInstructionAudio", () => {
  let playMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    playMock = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.play = playMock;
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when there is no instruction audio", () => {
    const { container } = renderWithProviders(<YoungLearnerInstructionAudio mediaId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("auto-plays the instruction audio without a tap, using the large visual button", async () => {
    renderWithProviders(<YoungLearnerInstructionAudio mediaId="media-1" />);

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
  });

  it("does not auto-play twice for the same media across rerenders", async () => {
    const { rerender } = renderWithProviders(<YoungLearnerInstructionAudio mediaId="media-1" />);
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));

    rerender(<YoungLearnerInstructionAudio mediaId="media-1" className="changed" />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(playMock).toHaveBeenCalledTimes(1);
  });
});
