import type {
  AppContext,
  FaktsStorage,
  ModuleRegistry,
  ServiceBuilder,
  ServiceBuilderMap,
} from "@/lib/arkitekt/provider";
import {
  buildArkitektProvider,
  ConnectedGuard,
  useArkitekt,
  useAvailableModules,
  useAvailableServices,
  useConfigurationIssues,
  usePotentialService,
  useService
} from "@/lib/arkitekt/provider";
import { Manifest, Requirement } from "./fakts/manifestSchema";
import {
  useArkitektActions,
  useArkitektStore,
  useActiveProfile,
  useActiveProfileId,
  useParkedProfileId,
  useProfileActions,
  useProfiles,
  useSelfService,
  useSwitchingProfileId,
} from "./hooks";
import { MeshIntegration, NodeIDProvider, WindowPopper } from "./types";
// When using the Tauri API npm package:

export const buildGuard =
  (key: string) => {
    const Guard = (props: { children: React.ReactNode; fallback?: React.ReactNode }) => {
      const service = usePotentialService(key);

      if (!service) {
        return props.fallback || null;
      }

      return props.children;
    };

   return Guard;
  }


  

export const buildWith =
  (key: string) =>
    <T extends (options: Record<string, unknown>) => unknown>(func: T): T => {
      const Wrapped = (options: Record<string, unknown>) => {
        const service = useService(key);

        return func({ ...options, client: service.client });
      };
      return Wrapped as unknown as T;
    };




export const buildArkitekt = <T extends ServiceBuilderMap, S extends ServiceBuilder>({
  manifest,
  serviceBuilderMap,
  selfServiceBuilder,
  moduleRegistry,
  storageProvider,
  windowPopper,
  nodeIDProvider,
  mesh,
}: {
  manifest: Manifest;
  serviceBuilderMap: T;
  selfServiceBuilder: S;
  moduleRegistry?: ModuleRegistry;
  storageProvider: FaktsStorage;
  windowPopper: WindowPopper;
  nodeIDProvider: NodeIDProvider;
  mesh?: MeshIntegration;
}) => {

  const requirements: Requirement[] = serviceBuilderMap
    ? Object.values(serviceBuilderMap).map((s) => ({
      service: s.service,
      key: s.key,
      optional: s.optional,
    }))
    : [];

  const realManifest: Manifest = {
    ...manifest,
    requirements: requirements,
  };

  return {
    Provider: buildArkitektProvider({
      manifest: realManifest,
      serviceBuilderMap,
      selfServiceBuilder: selfServiceBuilder,
      moduleRegistry,
      storageProvider,
      windowPopper,
      nodeIDProvider,
      mesh,
    }),
    buildServiceGuard: <K extends keyof T>(serviceKey: K) => buildGuard(serviceKey as string),
    Guard: ConnectedGuard,
    // Narrow on purpose: these are used all over the tree, and a hook that
    // reads the whole store re-renders its component on every store change.
    useConnect: () => useArkitektActions().connect,
    useDisconnect: () => useArkitektActions().disconnect,
    useReconnect: () => useArkitektActions().reconnect,
    useCancelConnection: () => useArkitektActions().cancelConnection,
    useManifest: () => realManifest,
    useConnectedManifest: () => useArkitektStore((state) => state.connection?.manifest),
    useConnection: (): AppContext<T>["connection"] =>
      useArkitektStore((state) => state.connection) as AppContext<T>["connection"],
    /** Is a connection live? Changes only when that answer does. */
    useIsConnected: () => useArkitektStore((state) => !!state.connection?.selfService),
    useFakts: () => useArkitektStore((state) => state.connection?.fakts),
    useAlias: <K extends keyof T>(serviceKey: K) => {
      const service = useService(serviceKey as string);
      return service?.alias;
    },
    useSelfService: () => useSelfService(),
    useSelf: () => useArkitektStore((state) => state.connection?.fakts.self),
    useAutoLoginError: (): AppContext<T>["autoLoginError"] => useArkitektStore((state) => state.autoLoginError),
    useAvailableServices: useAvailableServices,
    useAvailableModules: useAvailableModules,
    useConfigurationIssues: useConfigurationIssues,
    useService: <K extends keyof T,>(service: K): ReturnType<T[K]["builder"]> => useService(service as string) as ReturnType<T[K]["builder"]>,
    usePotentialService: <K extends keyof T,>(service: K): ReturnType<T[K]["builder"]> | undefined => usePotentialService(service as string) as ReturnType<T[K]["builder"]> | undefined,
    useToken: () =>
      useArkitektStore(
        (state) => state.connection?.token?.access_token || state.storedSession?.token?.access_token || null,
      ),
    useArkitekt: useArkitekt,
    useProfiles,
    useActiveProfile,
    useActiveProfileId,
    useSwitchingProfileId,
    useParkedProfileId,
    useProfileActions,
  };
};
