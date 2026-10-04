import * as Crypto from "expo-crypto";
import { scopeKey, ShareScope } from "./shareScope";

/**
 * A short, one-way name for a scope, so a link can be pasted in public: no
 * hostname, no organization. It can still be recognised by an app that
 * already holds the login, and cannot be turned into an invitation by one
 * that does not. Eight hex characters collide only against the handful of
 * logins kept on this phone.
 */
export const scopeDigest = async (scope: ShareScope): Promise<string> =>
  (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, scopeKey(scope))).slice(0, 8);
