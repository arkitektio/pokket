import type { LucideIcon, LucideProps } from "lucide-react-native";
import {
  Bell,
  ChartLine,
  File,
  Folder,
  Image,
  Layers,
  MessageCircle,
  Microscope,
  ScanSearch,
  Shapes,
  Table2,
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
  MapPinned,
  Network,
  Phone,
  Play,
  Radio,
  RadioTower,
  Receipt,
  Route,
  Send,
  Settings,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wifi,
} from "lucide-react-native";

/** The glyphs `catalog.ts` names — orkestrator's `matchIcon`. */
const ICONS: Record<string, LucideIcon> = {
  bell: Bell,
  bluetooth: Bluetooth,
  bug: Bug,
  "chart-line": ChartLine,
  file: File,
  folder: Folder,
  image: Image,
  layers: Layers,
  "message-circle": MessageCircle,
  microscope: Microscope,
  "scan-search": ScanSearch,
  shapes: Shapes,
  "table-2": Table2,
  flag: Flag,
  home: Home,
  inbox: Inbox,
  landmark: Landmark,
  "list-checks": ListChecks,
  mail: Mail,
  "mail-open": MailOpen,
  "map-pinned": MapPinned,
  network: Network,
  phone: Phone,
  play: Play,
  radio: Radio,
  "radio-tower": RadioTower,
  receipt: Receipt,
  route: Route,
  send: Send,
  settings: Settings,
  smartphone: Smartphone,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  wifi: Wifi,
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
