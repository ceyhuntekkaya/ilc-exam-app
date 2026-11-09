import { describe, expect, it } from "vitest";
import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import { fetchOpenReviewTotal, reviewListPath, reviewScopeKinds } from "@/src/features/review/reviewModel";
import { Perm } from "@/src/lib/permissions";
import { adminNavGroups, matchingNavItem, staffNavGroups, visibleNav } from "./panel-nav";

const hrefs = (groups: ReturnType<typeof visibleNav>) => groups.flatMap((g) => g.items.map((i) => i.href));

describe("R-32 menü ve kapsam", () => {
  it("admin ve staff menüsünde 'İnceleme talepleri' (rozetli)", () => {
    expect(hrefs(visibleNav("SUPER_ADMIN"))).toContain("/admin/review-requests");
    expect(matchingNavItem("/admin/review-requests/abc", adminNavGroups())).toMatchObject({ label: "İnceleme talepleri", badge: "reviewRequests" });
    expect(hrefs(visibleNav("STAFF", [Perm.assignmentEvaluate], "company-1"))).toContain("/staff/review-requests");
    expect(matchingNavItem("/staff/review-requests/abc", staffNavGroups())?.badge).toBe("reviewRequests");
  });

  it("staff: assignment:evaluate olmayan personelde menü yok", () => {
    expect(hrefs(visibleNav("STAFF", [Perm.assignmentManage], "company-1"))).not.toContain("/staff/review-requests");
  });

  it("kapsam: admin yalnız havuz; merkez personeli havuz + kendi kurumu; kurum personeli yalnız kendi kurumu", () => {
    expect(reviewScopeKinds("SUPER_ADMIN", null)).toEqual(["pool"]);
    expect(reviewScopeKinds("STAFF", HQ_CONTENT_ORG_ID)).toEqual(["pool", "own"]);
    expect(reviewScopeKinds("STAFF", "company-1")).toEqual(["own"]);
    expect(reviewScopeKinds("STAFF", null)).toEqual([]);
  });

  it("liste ucu: status, sayfa ve boyut sorgu olarak; rozet size=1 ile total okur", async () => {
    expect(reviewListPath("c1", "RESOLVED", 2)).toBe("/companies/c1/review-requests?status=RESOLVED&page=2&size=20");
    const { vi } = await import("vitest");
    const mod = await import("@/src/api/mutator");
    const spy = vi.spyOn(mod, "customInstance").mockResolvedValue({ data: { items: [], total: 7 } } as never);
    await expect(fetchOpenReviewTotal("c1")).resolves.toBe(7);
    expect(spy).toHaveBeenCalledWith("/companies/c1/review-requests?status=OPEN&page=0&size=1");
    spy.mockRestore();
  });
});
