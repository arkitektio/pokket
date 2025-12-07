import { File, Paths } from 'expo-file-system';
import { XMLParser } from 'fast-xml-parser';
import { useCallback, useState } from 'react';
import { EduroamDiscovery, EduroamInstance, EduroamProfile } from './types';

const DISCOVERY_URL = 'https://discovery.eduroam.app/v1/discovery.json';
const DISCOVERY_FILE = 'eduroam_discovery.json';

export function useEduroam() {
  const [discoveryData, setDiscoveryData] = useState<EduroamDiscovery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<EduroamInstance[]>([]);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const discoveryFile = new File(Paths.document, DISCOVERY_FILE);

      if (!discoveryFile.exists) {
        console.log('Downloading Eduroam discovery data...');
        await File.downloadFileAsync(DISCOVERY_URL, discoveryFile);
      }

      const content = await discoveryFile.text();
      const data = JSON.parse(content);
      setDiscoveryData(data);
    } catch (err) {
      console.error('Failed to initialize Eduroam:', err);
      setError('Failed to load Eduroam data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDiscovery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const discoveryFile = new File(Paths.document, DISCOVERY_FILE);
      console.log('Refreshing Eduroam discovery data...');
      await File.downloadFileAsync(DISCOVERY_URL, discoveryFile);
      
      const content = await discoveryFile.text();
      const data = JSON.parse(content);
      setDiscoveryData(data);
    } catch (err) {
      console.error('Failed to refresh Eduroam:', err);
      setError('Failed to refresh Eduroam data');
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback((query: string) => {
    if (!discoveryData || !query) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = discoveryData.instances.filter(instance => 
      instance.name.toLowerCase().includes(lowerQuery)
    );
    setSearchResults(results);
  }, [discoveryData]);

  const fetchEapConfig = useCallback(async (profile: EduroamProfile) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Downloading EAP config for:', profile.name);
      
      const eapFile = new File(Paths.document, `eap_config_${profile.id}.xml`);
      await File.downloadFileAsync(profile.eapconfig_endpoint, eapFile);

      const content = await eapFile.text();
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
      });
      const jsonObj = parser.parse(content);
      
      return jsonObj;
    } catch (err) {
      console.error('Failed to fetch EAP config:', err);
      setError('Failed to fetch university configuration');
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
    fetchEapConfig
  };
}
