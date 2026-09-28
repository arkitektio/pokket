import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useArkitektStore } from "../arkitekt/hooks";
import { ServiceHealthStatus } from "../arkitekt/types";
import { MODULE_CATALOG as MODULES, ModuleDecl } from "./catalog";

export type ModuleAvailability = "ready" | "checking" | "invalid";

export type AvailableModule = ModuleDecl & { status: ModuleAvailability };

const availabilityOf = (status: ServiceHealthStatus | undefined): ModuleAvailability =>
  status === "ready" ? "ready" : status === "checking" ? "checking" : "invalid";

/**
 * The modules this organization has, in rail order — as orkestrator's rail:
 * a service module is hidden unless its service is in the fakts, and shown
 * greyed (but still reachable, to say what is wrong) when it is not healthy.
 * Device modules are always there.
 */
export const useAvailableModules = (): AvailableModule[] => {
  // Keys and statuses only, compared shallowly, so health polling that
  // changes nothing does not redraw the sidebar.
  const statuses = useArkitektStore(
    useShallow((state) =>
      MODULES.map((module) => {
        if (!module.serviceKey) return "local";
        const service = state.serviceStates[module.serviceKey];
        if (!service?.configured) return "hidden";
        return availabilityOf(service.status);
      }),
    ),
  );

  return useMemo(
    () =>
      MODULES.flatMap((module, index) => {
        const status = statuses[index];
        if (status === "hidden") return [];
        return [{ ...module, status: status === "local" ? "ready" : status } as AvailableModule];
      }),
    [statuses],
  );
};
