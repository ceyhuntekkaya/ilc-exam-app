import { describe, expect, it } from "vitest";
import { detectBrowser, meetsRequirement } from "./browserCheck";

/**
 * F3-16/Adım 4: `BrowserPolicy.java`'nın `BrowserPolicyTest`'iyle aynı User-Agent dizgileri —
 * istemci tahmini sunucunun gerçek kararıyla aynı sonucu vermeli (bilgilendirme amaçlı olsa da).
 */
const CHROME_125 =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const CHROME_110 =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36";
const EDGE_125 =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0";
const SAFARI_DESKTOP_17 =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const SAFARI_IOS_17 =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const FIREFOX_125 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0";
const OPERA_125 =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/110.0.0.0";

describe("detectBrowser", () => {
  it("detects Chrome and Edge as TAM", () => {
    expect(detectBrowser(CHROME_125).browserClass).toBe("TAM");
    expect(detectBrowser(EDGE_125).browserClass).toBe("TAM");
  });

  it("blocks an old Chrome below the minimum version", () => {
    expect(detectBrowser(CHROME_110).browserClass).toBe("ENGELLI");
  });

  it("reads the Safari version from Version/XX, not the WebKit Safari/XX token", () => {
    const desktop = detectBrowser(SAFARI_DESKTOP_17);
    expect(desktop.version).toBe(17);
    expect(desktop.browserClass).toBe("ALISTIRMA");

    const ios = detectBrowser(SAFARI_IOS_17);
    expect(ios.version).toBe(17);
    expect(ios.browserClass).toBe("ALISTIRMA");
  });

  it("detects Firefox as ALISTIRMA", () => {
    expect(detectBrowser(FIREFOX_125).browserClass).toBe("ALISTIRMA");
  });

  it("does not misdetect Opera as Chrome", () => {
    expect(detectBrowser(OPERA_125).browserClass).toBe("ENGELLI");
  });

  it("treats an unrecognized or missing user agent as ENGELLI", () => {
    expect(detectBrowser("").browserClass).toBe("ENGELLI");
    expect(detectBrowser("some-bot/1.0").browserClass).toBe("ENGELLI");
  });
});

describe("meetsRequirement", () => {
  it("is true only when detected is at least as strong as required", () => {
    expect(meetsRequirement("TAM", "TAM")).toBe(true);
    expect(meetsRequirement("TAM", "ALISTIRMA")).toBe(true);
    expect(meetsRequirement("ALISTIRMA", "TAM")).toBe(false);
    expect(meetsRequirement("ALISTIRMA", "ALISTIRMA")).toBe(true);
    expect(meetsRequirement("ENGELLI", "ALISTIRMA")).toBe(false);
  });

  it("acceptance criterion: Safari cannot start a certification exam but can start practice", () => {
    const detected = detectBrowser(SAFARI_DESKTOP_17).browserClass;

    expect(meetsRequirement(detected, "TAM")).toBe(false);
    expect(meetsRequirement(detected, "ALISTIRMA")).toBe(true);
  });
});
