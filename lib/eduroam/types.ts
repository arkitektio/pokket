export interface EduroamProfile {
  id: string;
  name: string;
  eapconfig_endpoint: string;
}

export interface EduroamDiscovery {
  instances: EduroamInstance[];
}

export interface EduroamInstance {
  id: string;
  name: string;
  profiles: EduroamProfile[];
  geo: number[];
  country?: string;
}

export interface EapConfig {
  EAPIdentityProvider: {
    AuthenticationMethods: {
      AuthenticationMethod: {
        EAPMethod: {
          Type: number;
        };
      };
    };
    CredentialApplicability: {
      IEEE80211: {
        SSID: string;
      };
    };
    ProviderInfo: {
      DisplayName: string;
      Description: string;
    };
  };
}
