import { describe, expect, it } from "@jest/globals";
import { endpoint, fakts } from "@/lib/testing/meshFixtures";
import {
  createProfileFromSession,
  deriveProfileId,
  emptyProfileBook,
  getActiveProfile,
  groupProfilesByDeployment,
  isProvisionalProfileId,
  loadStoredProfileBook,
  markProfileStale,
  PROFILE_BOOK_STORAGE_KEY,
  provisionalProfileId,
  reidentifyProfile,
  removeProfile,
  setActiveProfile,
  StoredProfileBook,
  upsertProfile,
  writeStoredProfileBook,
} from "../profileStorageSchema";
import { StoredArkitektSession } from "../sessionStorageSchema";

const session = (refresh: string): StoredArkitektSession => ({
  endpoint,
  fakts,
  token: { access_token: "a", token_type: "Bearer", refresh_token: refresh, client_id: "c", expires_in: 3600 },
  aliasMap: { aliasMap: {} },
});

const mesh = { id: "node1", label: "Test", controlUrl: "https://mesh.go.test", hosts: [], enabled: true };

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    get: async (key: string) => data.get(key) ?? null,
    set: async (key: string, value: string) => void data.set(key, value),
    remove: async (key: string) => void data.delete(key),
  };
};

const withProfile = (id: string, refresh = "r1", book: StoredProfileBook = emptyProfileBook()) =>
  setActiveProfile(upsertProfile(book, createProfileFromSession(id, session(refresh))), id);

describe("profile book", () => {
  it("keeps a second login next to the first", () => {
    const a = provisionalProfileId(endpoint.base_url);
    const b = `${a}-b`;
    const book = withProfile(b, "r2", withProfile(a));
    expect(Object.keys(book.profiles)).toHaveLength(2);
    expect(getActiveProfile(book)?.id).toBe(b);
    expect(isProvisionalProfileId(a)).toBe(true);
  });

  it("gives a login its real id once lok says who it is", () => {
    const pending = provisionalProfileId(endpoint.base_url);
    const identity = { baseUrl: endpoint.base_url, userId: "u1", organizationId: "o1" };
    const { book, id } = reidentifyProfile(withProfile(pending), pending, identity);
    expect(id).toBe(deriveProfileId(identity));
    expect(book.activeProfileId).toBe(id);
    expect(book.profiles[pending]).toBeUndefined();
    expect(book.profiles[id].identity).toEqual(identity);
  });

  it("merges a repeat sign-in into the organization's row, keeping its mesh", () => {
    const identity = { baseUrl: endpoint.base_url, userId: "u1", organizationId: "o1" };
    const realId = deriveProfileId(identity);
    let book = upsertProfile(emptyProfileBook(), {
      ...createProfileFromSession(realId, session("old"), mesh),
      identity,
      label: { organizationName: "Lab" },
    });
    book = markProfileStale(book, realId, "expired");
    const pending = provisionalProfileId(endpoint.base_url);
    book = withProfile(pending, "new", book);

    const merged = reidentifyProfile(book, pending, identity);
    expect(Object.keys(merged.book.profiles)).toEqual([realId]);
    const profile = merged.book.profiles[realId];
    expect(profile.session.token.refresh_token).toBe("new");
    expect(profile.status).toBe("ok");
    expect(profile.mesh).toEqual(mesh);
    expect(profile.label.organizationName).toBe("Lab");
    expect(merged.book.activeProfileId).toBe(realId);
  });

  it("removing the live login leaves none live", () => {
    const id = provisionalProfileId(endpoint.base_url);
    const book = removeProfile(withProfile(id), id);
    expect(book.activeProfileId).toBeNull();
    expect(book.profiles).toEqual({});
  });

  it("groups logins by deployment", () => {
    const book = withProfile("b", "r", withProfile("a"));
    const groups = groupProfilesByDeployment(Object.values(book.profiles));
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe("Test");
    expect(groups[0].profiles).toHaveLength(2);
  });

  it("round-trips through storage, dropping only unreadable rows", async () => {
    const storage = memoryStorage();
    const book = withProfile("a");
    await writeStoredProfileBook(book, storage);
    expect(await loadStoredProfileBook(storage)).toEqual(book);

    const raw = JSON.parse(storage.data.get(PROFILE_BOOK_STORAGE_KEY)!);
    raw.profiles.broken = { id: "broken", session: { nope: true } };
    storage.data.set(PROFILE_BOOK_STORAGE_KEY, JSON.stringify(raw));
    const loaded = await loadStoredProfileBook(storage);
    expect(Object.keys(loaded!.profiles)).toEqual(["a"]);
    expect(loaded!.activeProfileId).toBe("a");
  });

  it("has no book before the first write", async () => {
    expect(await loadStoredProfileBook(memoryStorage())).toBeNull();
  });
});
