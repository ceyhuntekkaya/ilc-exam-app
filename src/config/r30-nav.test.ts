import { describe, expect, it } from "vitest";
import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import { Perm } from "@/src/lib/permissions";
import { matchingNavItem, staffNavGroups, visibleNav } from "./panel-nav";

const hrefs = (groups: ReturnType<typeof visibleNav>) => groups.flatMap((g) => g.items.map((i) => i.href));

describe("R-30 menüleri", () => {
  it("admin: bireysel havuz kuyruğu ve Merkez AI ayarı", () => {
    const list = hrefs(visibleNav("SUPER_ADMIN"));
    expect(list).toContain("/admin/grading/individual");
    expect(list).toContain("/admin/ai");
  });
  it("staff: bireysel havuz kuyruğu yalnız assignment:evaluate + merkez personeline", () => {
    const href = "/staff/grading/individual";
    expect(hrefs(visibleNav("STAFF", [Perm.assignmentEvaluate], HQ_CONTENT_ORG_ID))).toContain(href);
    expect(hrefs(visibleNav("STAFF", [Perm.assignmentEvaluate], "00000000-0000-0000-0000-000000000001"))).not.toContain(href);
    expect(hrefs(visibleNav("STAFF", [Perm.assignmentManage], HQ_CONTENT_ORG_ID))).not.toContain(href);
    expect(matchingNavItem(href, staffNavGroups())?.centralOnly).toBe(true);
  });
});
