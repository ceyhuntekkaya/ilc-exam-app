import { describe, expect, it } from "vitest";
import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import { Perm } from "@/src/lib/permissions";
import { matchingNavItem, staffNavGroups, visibleNav } from "./panel-nav";

const hrefs = (groups: ReturnType<typeof visibleNav>) => groups.flatMap((g) => g.items.map((i) => i.href));

describe("R-27 menüleri (izne göre)", () => {
  it("Madde uyumu psychometrics:manage ister (staff) ve admin'de görünür", () => {
    expect(hrefs(visibleNav("STAFF", [Perm.psychometricsManage]))).toContain("/staff/content/item-fit");
    expect(hrefs(visibleNav("STAFF", [Perm.examRead]))).not.toContain("/staff/content/item-fit");
    expect(hrefs(visibleNav("SUPER_ADMIN"))).toContain("/admin/content/item-fit");
  });
  it("Seviye raporu işleri yalnız psychometrics:manage + merkez personeline", () => {
    const href = "/staff/level-report-jobs";
    expect(hrefs(visibleNav("STAFF", [Perm.psychometricsManage], HQ_CONTENT_ORG_ID))).toContain(href);
    expect(hrefs(visibleNav("STAFF", [Perm.psychometricsManage], "00000000-0000-0000-0000-000000000001"))).not.toContain(href);
    expect(hrefs(visibleNav("STAFF", [Perm.examRead], HQ_CONTENT_ORG_ID))).not.toContain(href);
    expect(hrefs(visibleNav("SUPER_ADMIN"))).toContain("/admin/level-report-jobs");
    expect(matchingNavItem(href, staffNavGroups())?.centralOnly).toBe(true);
  });
  it("Saklama ve silme yalnız retention:manage ya da erasure:manage + merkez personeline; admin'de görünür", () => {
    const href = "/staff/retention";
    expect(hrefs(visibleNav("STAFF", [Perm.retentionManage], HQ_CONTENT_ORG_ID))).toContain(href);
    expect(hrefs(visibleNav("STAFF", [Perm.erasureManage], HQ_CONTENT_ORG_ID))).toContain(href);
    expect(hrefs(visibleNav("STAFF", [Perm.retentionManage], "00000000-0000-0000-0000-000000000001"))).not.toContain(href);
    expect(hrefs(visibleNav("STAFF", [Perm.centerManage, Perm.studentManage], HQ_CONTENT_ORG_ID))).not.toContain(href);
    expect(hrefs(visibleNav("SUPER_ADMIN"))).toContain("/admin/retention");
    expect(matchingNavItem(href, staffNavGroups())?.perms).toEqual([Perm.retentionManage, Perm.erasureManage]);
  });
});
