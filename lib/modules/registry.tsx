import type { LucideIcon, LucideProps } from "lucide-react-native";
import {
  Bell,
  Bluetooth,
  Bug,
  Circle,
  Flag,
  Home,
  Inbox,
  Landmark,
  ListChecks,
  Mail,
  MailOpen,
  Network,
  Radio,
  RadioTower,
  Receipt,
  Send,
  Settings,
  Smartphone,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";

/** The glyphs `catalog.ts` names — orkestrator's `matchIcon`. */
const ICONS: Record<string, LucideIcon> = {
  bell: Bell,
  bluetooth: Bluetooth,
  bug: Bug,
  flag: Flag,
  home: Home,
  inbox: Inbox,
  landmark: Landmark,
  "list-checks": ListChecks,
  mail: Mail,
  "mail-open": MailOpen,
  network: Network,
  radio: Radio,
  "radio-tower": RadioTower,
  receipt: Receipt,
  send: Send,
  settings: Settings,
  smartphone: Smartphone,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
};

export const iconFor = (name: string | undefined): LucideIcon => (name && ICONS[name]) || Circle;

export { ICONS };

/**
 * A glyph by its catalog name. A component rather than `iconFor(name)` in
 * render, which would make a new component type out of a lookup each time.
 */
export function NamedIcon({ name, ...props }: { name: string | undefined } & LucideProps) {
  const Icon = (name && ICONS[name]) || Circle;
  return <Icon {...props} />;
}
