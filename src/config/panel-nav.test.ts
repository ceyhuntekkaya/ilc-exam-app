import { describe, expect, it } from "vitest";
import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import { navItemAllowed, staffNavGroups, visibleNav } from "@/src/config/panel-nav";
import { Perm } from "@/src/lib/permissions";

const hrefs = (permissions: string[], companyId?: string) =>
  visibleNav("STAFF", permissions, companyId).flatMap((g) => g.items.map((i) => i.href));

describe("R-15 menü", () => {
  it("psikometri ekranları yalnız psychometrics:manage olana görünür", () => {
    const withPerm = hrefs([Perm.psychometricsManage], HQ_CONTENT_ORG_ID);
    for (const slug of ["dif", "anchor-sets", "standard-setting"]) {
      expect(withPerm).toContain(`/staff/content/${slug}`);
    }
    const without = hrefs([Perm.examRead], "kurum-1");
    for (const slug of ["dif", "anchor-sets", "standard-setting"]) {
      expect(without).not.toContain(`/staff/content/${slug}`);
    }
  });

  it("panelist ekranı yalnız merkez personeline görünür (izin kodu yok)", () => {
    expect(hrefs([], HQ_CONTENT_ORG_ID)).toContain("/staff/content/panelist");
    expect(hrefs([Perm.psychometricsManage], "kurum-1")).not.toContain("/staff/content/panelist");
    expect(hrefs([Perm.psychometricsManage])).not.toContain("/staff/content/panelist");
  });

  it("kazanım ağacı exam:read veya dictionary:manage ile görünür", () => {
    expect(hrefs([Perm.examRead], "kurum-1")).toContain("/staff/content/outcome-tree");
    expect(hrefs([Perm.dictionaryManage], "kurum-1")).toContain("/staff/content/outcome-tree");
    expect(hrefs([Perm.studentManage], "kurum-1")).not.toContain("/staff/content/outcome-tree");
  });

  it("rota kapısı menü kapısıyla aynı kuralı uygular", () => {
    const panelist = staffNavGroups().flatMap((g) => g.items).find((i) => i.href.endsWith("/panelist"))!;
    expect(navItemAllowed(panelist, [], HQ_CONTENT_ORG_ID)).toBe(true);
    expect(navItemAllowed(panelist, [], "kurum-1")).toBe(false);
  });

  it("süper admin menüsünde panelist ekranı yoktur", () => {
    const all = visibleNav("SUPER_ADMIN").flatMap((g) => g.items.map((i) => i.href));
    expect(all).toContain("/admin/content/standard-setting");
    expect(all).not.toContain("/admin/content/panelist");
  });
});
