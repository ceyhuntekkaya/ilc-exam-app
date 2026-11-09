import { describe, expect, it } from "vitest";
import { adminNavGroups, matchingNavItem, staffNavGroups, visibleNav } from "./panel-nav";
import { Perm } from "@/src/lib/permissions";

const hrefs = (groups: ReturnType<typeof visibleNav>) => groups.flatMap((g) => g.items.map((i) => i.href));

describe("ödeme onayı menüsü", () => {
  it("personelde yalnız center:manage izni olana görünür", () => {
    expect(hrefs(visibleNav("STAFF", [Perm.centerManage]))).toContain("/staff/payments");
    expect(hrefs(visibleNav("STAFF", [Perm.assignmentManage, Perm.reportViewCompany]))).not.toContain("/staff/payments");
    expect(hrefs(visibleNav("STAFF", []))).not.toContain("/staff/payments");
  });
  it("izinsiz personel için rota yetki kontrolü eşleşir (erişim yok ekranı)", () => {
    const match = matchingNavItem("/staff/payments", staffNavGroups());
    expect(match?.perms).toEqual([Perm.centerManage]);
  });
  it("admin menüsünde bulunur", () => {
    expect(hrefs(visibleNav("SUPER_ADMIN"))).toContain("/admin/payments");
    expect(matchingNavItem("/admin/payments", adminNavGroups())?.label).toBe("Ödeme onayı");
  });
});
