/**
 * (Ported from orkestrator-next, which issues the same way.)
 *
 * Devices are keyed under ONE standing agent mandate per firmware app: this
 * app is its agent, the firmware's app identifier its subject. Each device
 * then gets a child key pinned to its device_id (`issueChildMandateKey`),
 * which lives as long as the parent. pokket issues the same way, and lok
 * lets a device's new key take over the client it had under an older
 * mandate, so re-keying keeps its client and its rekuest agent.
 *
 * Whether devices may join the mesh is the parent's (`allowMesh`, inherited by
 * every child key), so there is one standing mandate per firmware app and
 * mesh permission.
 */

export type StandingCandidate = {
  id: string;
  agentIdentifier?: string | null;
  claimant: string;
  allowMesh: boolean;
  subject: {
    identifier?: string | null;
    version?: string | null;
    scopes?: readonly string[] | null;
    requirements?: readonly { key: string; service: string }[] | null;
  };
  parent?: { id: string } | null;
};

/** What a device asks for, as its manifest says. */
export type WantedManifest = {
  version: string;
  scopes: readonly string[];
  requirements: readonly { key: string; service: string }[];
};

/**
 * Whether a key under this mandate can log the device in: the same
 * version, and its scopes and requirements within the mandate's (they are
 * its ceiling). A firmware that asks for more needs a new standing mandate,
 * or lok refuses its key at login.
 */
export const covers = (subject: StandingCandidate["subject"], wanted: WantedManifest): boolean =>
  (subject.version == null || subject.version === wanted.version) &&
  wanted.scopes.every((scope) => (subject.scopes ?? []).includes(scope)) &&
  wanted.requirements.every((r) =>
    (subject.requirements ?? []).some((pin) => pin.key === r.key && pin.service === r.service),
  );

/**
 * The live standing mandate this app (`agent`) holds for `subjectIdentifier`
 * with this mesh permission, if any; with `wanted`, only one that covers it.
 */
export const findStandingMandate = <T extends StandingCandidate>(
  mandates: readonly T[],
  agent: string,
  subjectIdentifier: string,
  allowMesh: boolean,
  wanted?: WantedManifest,
): T | undefined =>
  mandates.find(
    (m) =>
      m.claimant === "AGENT" &&
      !m.parent &&
      m.agentIdentifier === agent &&
      m.subject.identifier === subjectIdentifier &&
      m.allowMesh === allowMesh &&
      (!wanted || covers(m.subject, wanted)),
  );
