import { File, Paths } from "expo-file-system";
import { XMLParser } from "fast-xml-parser";
import { useCallback, useState } from "react";
import {
  EapConfig,
  EapConfigSchema,
  EduroamDiscovery,
  EduroamInstance,
  EduroamProfile,
} from "./types";

/**
 * Extract the first PEM certificate from a parsed EAP config.
 * The CA cert text is base64-encoded DER in the XML; we wrap it as PEM.
 */
export function extractPemCertificate(eapConfig: EapConfig): string | null {
  const serverCred =
    eapConfig.EAPIdentityProviderList.EAPIdentityProvider.AuthenticationMethods
      .AuthenticationMethod.ServerSideCredential;
  if (!serverCred?.CA) return null;

  const caEntry = Array.isArray(serverCred.CA)
    ? serverCred.CA[0]
    : serverCred.CA;
  const raw = caEntry["#text"];
  if (!raw) return null;

  const trimmed = raw.replace(/\s/g, "");
  // Wrap in PEM headers if not already present
  if (trimmed.startsWith("-----BEGIN")) return raw;
  const lines = trimmed.match(/.{1,64}/g) || [];
  return [
    "-----BEGIN CERTIFICATE-----",
    ...lines,
    "-----END CERTIFICATE-----",
  ].join("\n");
}

const DISCOVERY_URL = "https://discovery.eduroam.app/v1/discovery.json";
const DISCOVERY_FILE = "eduroam_discovery.json";

export function useEduroam() {
  const [discoveryData, setDiscoveryData] = useState<EduroamDiscovery | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<EduroamInstance[]>([]);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const discoveryFile = new File(Paths.document, DISCOVERY_FILE);

      if (!discoveryFile.exists) {
        console.log("Downloading Eduroam discovery data...");
        await File.downloadFileAsync(DISCOVERY_URL, discoveryFile);
      }

      const content = await discoveryFile.text();
      const data = JSON.parse(content);
      setDiscoveryData(data);
    } catch (err) {
      console.error("Failed to initialize Eduroam:", err);
      setError("Failed to load Eduroam data");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDiscovery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const discoveryFile = new File(Paths.document, DISCOVERY_FILE);
      console.log("Refreshing Eduroam discovery data...");
      await File.downloadFileAsync(DISCOVERY_URL, discoveryFile);

      const content = await discoveryFile.text();
      const data = JSON.parse(content);
      setDiscoveryData(data);
    } catch (err) {
      console.error("Failed to refresh Eduroam:", err);
      setError("Failed to refresh Eduroam data");
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(
    (query: string) => {
      if (!discoveryData || !query) {
        setSearchResults([]);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const results = discoveryData.instances.filter((instance) =>
        instance.name.toLowerCase().includes(lowerQuery),
      );
      setSearchResults(results);
    },
    [discoveryData],
  );

  const fetchEapConfig = useCallback(async (profile: EduroamProfile) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Downloading EAP config for:", profile.name);

      const eapFile = new File(Paths.document, `eap_config_${profile.id}.xml`);
      await File.downloadFileAsync(profile.eapconfig_endpoint, eapFile, {
        idempotent: true,
      });

      const content = await eapFile.text();

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });
      const jsonObj = parser.parse(content);
      console.log("Parsed EAP config JSON:", jsonObj);
      const eapConfig = EapConfigSchema.parse(jsonObj);

      return eapConfig;
    } catch (err) {
      console.error("Failed to fetch EAP config:", err);
      setError("Failed to fetch university configuration");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    discoveryData,
    searchResults,
    initialize,
    refreshDiscovery,
    search,
    fetchEapConfig,
  };
}
