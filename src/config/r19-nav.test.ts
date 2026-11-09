import { describe, expect, it } from "vitest";
import { adminNavGroups, matchingNavItem, staffNavGroups, visibleNav } from "./panel-nav";
import { Perm } from "@/src/lib/permissions";

const hrefs = (groups: ReturnType<typeof visibleNav>) => groups.flatMap((g) => g.items.map((i) => i.href));

describe("R-19 menüleri (izne göre)", () => {
  it("Sertifikalar: certificate:manage ya da assignment:evaluate (salt iptal) ile görünür", () => {
    expect(hrefs(visibleNav("STAFF", [Perm.certificateManage]))).toContain("/staff/certificates");
    expect(hrefs(visibleNav("STAFF", [Perm.assignmentEvaluate]))).toContain("/staff/certificates");
    expect(hrefs(visibleNav("STAFF", [Perm.reportViewCompany]))).not.toContain("/staff/certificates");
    expect(hrefs(visibleNav("STAFF", []))).not.toContain("/staff/certificates");
  });
  it("Gözetmen akreditasyonu ve Politika ayarları yalnız center:manage ile", () => {
    for (const href of ["/staff/proctor-credentials", "/staff/policy-settings"]) {
      expect(hrefs(visibleNav("STAFF", [Perm.centerManage]))).toContain(href);
      expect(hrefs(visibleNav("STAFF", [Perm.certificateManage, Perm.assignmentManage]))).not.toContain(href);
      expect(matchingNavItem(href, staffNavGroups())?.perms).toEqual([Perm.centerManage]);
    }
  });
  it("Sertifika kapısı (demet onayı) psychometrics:manage ister; merkez kapısı sunucuda", () => {
    expect(hrefs(visibleNav("STAFF", [Perm.psychometricsManage]))).toContain("/staff/content/certificate-gate");
    expect(hrefs(visibleNav("STAFF", [Perm.examRead]))).not.toContain("/staff/content/certificate-gate");
    expect(hrefs(visibleNav("SUPER_ADMIN"))).toContain("/admin/content/certificate-gate");
  });
  it("admin menüsü yeni ekranları içerir", () => {
    const admin = hrefs(visibleNav("SUPER_ADMIN"));
    for (const href of ["/admin/certificates", "/admin/policy-settings", "/admin/proctor-credentials"]) expect(admin).toContain(href);
    expect(matchingNavItem("/admin/certificates", adminNavGroups())?.label).toBe("Sertifikalar");
  });
});
