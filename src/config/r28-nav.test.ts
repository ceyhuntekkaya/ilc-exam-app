import { describe, expect, it } from "vitest";
import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import { Perm } from "@/src/lib/permissions";
import { matchingNavItem, staffNavGroups, visibleNav } from "./panel-nav";

const hrefs = (groups: ReturnType<typeof visibleNav>) => groups.flatMap((g) => g.items.map((i) => i.href));

describe("R-28 menüleri", () => {
  it("Üyelik backfill yalnız staff:manage_roles + merkez personeline; admin'de görünür", () => {
    const href = "/staff/memberships";
    expect(hrefs(visibleNav("STAFF", [Perm.staffManageRoles], HQ_CONTENT_ORG_ID))).toContain(href);
    expect(hrefs(visibleNav("STAFF", [Perm.staffManageRoles], "00000000-0000-0000-0000-000000000001"))).not.toContain(href);
    expect(hrefs(visibleNav("STAFF", [Perm.staffAssignScope], HQ_CONTENT_ORG_ID))).not.toContain(href);
    expect(hrefs(visibleNav("SUPER_ADMIN"))).toContain("/admin/memberships");
    const item = matchingNavItem(href, staffNavGroups());
    expect(item?.centralOnly).toBe(true);
    expect(item?.perms).toEqual([Perm.staffManageRoles]);
  });
  it("Personel sayfası staff:assign_scope ister (birim kapsamı bu sayfada)", () => {
    expect(matchingNavItem("/staff/personnel", staffNavGroups())?.perms).toEqual([Perm.staffAssignScope]);
  });
});
