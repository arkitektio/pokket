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
import { useSelfService } from "./hooks";
import { NodeIDProvider, WindowPopper } from "./types";
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
  nodeIDProvider
}: {
  manifest: Manifest;
  serviceBuilderMap: T;
  selfServiceBuilder: S;
  moduleRegistry?: ModuleRegistry;
  storageProvider: FaktsStorage;
  windowPopper: WindowPopper;
  nodeIDProvider: NodeIDProvider;

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
    }),
    buildServiceGuard: <K extends keyof T>(serviceKey: K) => buildGuard(serviceKey as string),
    Guard: ConnectedGuard,
    useConnect: () => useArkitekt().connect,
    useDisconnect: () => useArkitekt().disconnect,
    useReconnect: () => useArkitekt().reconnect,
    useCancelConnection: () => useArkitekt().cancelConnection,
    useManifest: () => realManifest,
    useConnectedManifest: () => useArkitekt().connection?.manifest,
    useConnection: (): AppContext<T>["connection"] => useArkitekt().connection as AppContext<T>["connection"],
    useFakts: () => useArkitekt().connection?.fakts,
    useAlias: <K extends keyof T>(serviceKey: K) => {
      const service = useService(serviceKey as string);
      return service?.alias;
    },
    useSelfService: () => useSelfService(),
    useSelf: () => useArkitekt().connection?.fakts.self,
    useAutoLoginError: (): AppContext<T>["autoLoginError"] => useArkitekt().autoLoginError,
    useAvailableServices: useAvailableServices,
    useAvailableModules: useAvailableModules,
    useConfigurationIssues: useConfigurationIssues,
    useService: <K extends keyof T,>(service: K): ReturnType<T[K]["builder"]> => useService(service as string) as ReturnType<T[K]["builder"]>,
    usePotentialService: <K extends keyof T,>(service: K): ReturnType<T[K]["builder"]> | undefined => usePotentialService(service as string) as ReturnType<T[K]["builder"]> | undefined,
    useToken: () => {
      const arkitekt = useArkitekt();
      return arkitekt.connection?.token?.access_token || arkitekt.storedSession?.token?.access_token || null;
    },
    useArkitekt: useArkitekt,
  };
};
