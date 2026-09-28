import { useContext, useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { ArkitektContext } from "./context";
import { getActiveProfile, listProfiles, StoredProfile } from "./fakts/profileStorageSchema";
import {
  AppContext,
  AppFunctions,
  ArkitektContextType,
  ModuleRuntimeState,
  Service,
  ServiceRuntimeState,
} from "./types";

const useArkitektContext = () => {
  const context = useContext(ArkitektContext);

  if (!context) {
    throw new Error("Arkitekt provider missing");
  }

  return context;
};

export const useArkitektStore = <T,>(selector: (state: AppContext) => T) => {
  const { store } = useArkitektContext();

  return useStore(store, selector);
};

/** The provider's actions alone: stable for the provider's life, so this never re-renders. */
export const useArkitektActions = (): AppFunctions => useArkitektContext().actions;

/**
 * The whole state and every action. Re-renders on ANY store change — every
 * service check, token refresh and profile write — so reach for a selector
 * (`useArkitektStore`) or `useArkitektActions` wherever a component needs
 * less than everything.
 */
export const useArkitekt = () => {
  const state = useArkitektStore((currentState) => currentState) as AppContext;
  const actions = useArkitektActions();

  return useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [actions, state],
  ) as ArkitektContextType;
};

export const useService = (key: string): Service => {
  const service = useArkitektStore((state) => state.connection?.serviceMap[key]);

  if (!service) {
    throw new Error(`Service ${key} not found`);
  }

  return service as Service;
};

export const useSelfService = (): Service => {
  const service = useArkitektStore((state) => {
    const selfService = state.connection?.selfService;
    return selfService;
  });

  if (!service) {
    throw new Error(`Self service not found`);
  }

  return service;
};

export const useAvailableServices = (): ServiceRuntimeState[] =>
  useArkitektStore(
    useShallow((state) => Object.values(state.serviceStates).filter((entry) => entry.configured)),
  );

export const useAvailableModules = (): ModuleRuntimeState[] =>
  useArkitektStore(
    useShallow((state) => Object.values(state.moduleStates).filter((entry) => entry.status !== "hidden")),
  );

export const useServiceState = (key: string): ServiceRuntimeState | undefined =>
  useArkitektStore((state) => state.serviceStates[key]);

export const usePotentialService = (key: string): Service | undefined =>
  useArkitektStore((state) => state.connection?.serviceMap?.[key] as Service | undefined);

export const useToken = () => {
  const token = useArkitektStore((state) => state.connection?.token ?? state.storedSession?.token ?? null);
  return token?.access_token || null;
};

export const useManifest = () => useArkitektStore((state) => state.manifest);

export const useConfigurationIssues = (): string[] =>
  useArkitektStore((state) => state.configurationIssues);

// ── profiles (kept logins, one per organization) ──

/** Every kept login, most recently used first. */
export const useProfiles = (): StoredProfile[] => {
  const book = useArkitektStore((state) => state.profileBook);
  return useMemo(() => listProfiles(book), [book]);
};

export const useActiveProfileId = (): string | null =>
  useArkitektStore((state) => state.profileBook.activeProfileId);

export const useActiveProfile = (): StoredProfile | null =>
  useArkitektStore((state) => getActiveProfile(state.profileBook));

export const useSwitchingProfileId = (): string | null =>
  useArkitektStore((state) => state.switchingProfileId);

export const useParkedProfileId = (): string | null =>
  useArkitektStore((state) => state.parkedProfileId);

export const useProfileActions = () => {
  const actions = useArkitektActions();
  return useMemo(
    () => ({
      switchProfile: actions.switchProfile,
      signOutProfile: actions.signOutProfile,
      addProfile: actions.addProfile,
      cancelAddProfile: actions.cancelAddProfile,
      setProfileIdentity: actions.setProfileIdentity,
    }),
    [actions],
  );
};
