import { describe, expect, it } from "@jest/globals";
import {
  createProfileFromSession,
  emptyProfileBook,
  markProfileStale,
  StoredProfileBook,
  upsertProfile,
} from "@/lib/arkitekt/fakts/profileStorageSchema";
import type { StoredArkitektSession } from "@/lib/arkitekt/fakts/sessionStorageSchema";
import { endpoint, fakts } from "@/lib/testing/meshFixtures";
import { planHeadlessBackup } from "../backupPlan";
import { defaultTimelineSettings } from "../settings";

const lokate = { id: "lokate-1", host: "lokate.lab.test", ssl: true, challenge: "ht" };

const session = (alias?: typeof lokate): StoredArkitektSession => ({
  endpoint,
  fakts,
  token: { access_token: "a", token_type: "Bearer", refresh_token: "r", client_id: "c", expires_in: 3600 },
  aliasMap: { aliasMap: alias ? { lokate: alias } : {} },
});

const book = (alias: typeof lokate | null = lokate, mesh?: Parameters<typeof createProfileFromSession>[2]): StoredProfileBook =>
  upsertProfile(emptyProfileBook(), createProfileFromSession("p1", session(alias ?? undefined), mesh));

const settings = { ...defaultTimelineSettings(), backupProfileId: "p1", backupIntervalMin: 60 };

describe("planHeadlessBackup", () => {
  it("backs up to the backup's organization, at its stored lokate address", () => {
    const plan = planHeadlessBackup(settings, book(), "background");
    expect(plan).toMatchObject({ kind: "run", profileId: "p1", alias: lokate });
  });

  it("does nothing without an automatic backup", () => {
    expect(planHeadlessBackup({ ...settings, backupIntervalMin: 0 }, book(), "background").kind).toBe("skip");
    expect(planHeadlessBackup({ ...settings, backupProfileId: null }, book(), "background").kind).toBe("skip");
  });

  it("stands aside while pokket is open", () => {
    expect(planHeadlessBackup(settings, book(), "active").kind).toBe("skip");
  });

  it("skips a login that needs signing in again, or an organization that is gone", () => {
    expect(planHeadlessBackup(settings, markProfileStale(book(), "p1"), "background").kind).toBe("skip");
    expect(planHeadlessBackup(settings, emptyProfileBook(), "background").kind).toBe("skip");
    expect(planHeadlessBackup(settings, null, "background").kind).toBe("skip");
  });

  it("skips before lokate was ever reached", () => {
    expect(planHeadlessBackup(settings, book(null), "background").kind).toBe("skip");
  });

  it("goes through the organization's mesh when lokate is on it", () => {
    const mesh = { id: "n1", label: "Lab", controlUrl: "https://mesh.lab.test", hosts: ["lokate.lab.test"], enabled: true };
    expect(planHeadlessBackup(settings, book(lokate, mesh), "background")).toMatchObject({ kind: "run", mesh });
    // A mesh that is switched off does not count.
    const direct = planHeadlessBackup(settings, book(lokate, { ...mesh, enabled: false }), "background");
    expect(direct).toMatchObject({ kind: "run" });
    expect(direct.kind === "run" && direct.mesh).toBeUndefined();
  });

  it("while open, backs up an organization other than the active one", () => {
    const other = { ...book(), activeProfileId: "p2" };
    expect(planHeadlessBackup(settings, other, "active", { whileOpen: true }).kind).toBe("run");
    const same = { ...book(), activeProfileId: "p1" };
    expect(planHeadlessBackup(settings, same, "active", { whileOpen: true }).kind).toBe("skip");
  });
});
