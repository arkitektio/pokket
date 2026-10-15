import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  AtSign,
  Ban,
  BarChart3,
  Bell,
  Bookmark,
  Box,
  Braces,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Circle,
  CircleDot,
  Clipboard,
  Clock,
  Cloud,
  Code,
  Cog,
  Copy,
  Cpu,
  Database,
  Download,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileText,
  Filter,
  Flag,
  Folder,
  FolderOpen,
  Gauge,
  Globe,
  Grid3x3,
  Hash,
  Heart,
  HelpCircle,
  History,
  Home,
  Image,
  Inbox,
  Info,
  Key,
  Layers,
  LayoutDashboard,
  Link,
  List,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Map,
  Maximize2,
  Menu,
  MessageCircle,
  Microscope,
  Minimize2,
  Minus,
  Monitor,
  MoreHorizontal,
  MoreVertical,
  Move,
  Network,
  Package,
  Paperclip,
  Pause,
  Pencil,
  Play,
  Plus,
  Power,
  RefreshCw,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Send,
  Server,
  Settings,
  Share2,
  Shield,
  SkipForward,
  Sliders,
  Square,
  Star,
  StopCircle,
  Table,
  Tag,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  UserPlus,
  Users,
  Video,
  Wand2,
  Workflow,
  Wrench,
  X,
  XCircle,
  Zap,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react-native';
import * as z from 'zod';
import {createBlokComponent, useBlok, useValue} from '@/lib/ports/blok/runtime';
import {iconWithClassName} from '@/lib/icons/iconWithClassName';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {classNameSchema, numberSchema} from './shared';

/**
 * The icons a blok payload may name, after orkestrator's `bloks/icons.tsx`.
 *
 * The same explicit allowlist (from `lucide-react-native` here): the enum
 * derived from its keys is what tells an author which names exist, and it
 * must match orkestrator's so a payload validates on both.
 */
export const BLOK_ICONS = {
  activity: Activity,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  archive: Archive,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'at-sign': AtSign,
  ban: Ban,
  'bar-chart': BarChart3,
  bell: Bell,
  bookmark: Bookmark,
  box: Box,
  braces: Braces,
  calendar: Calendar,
  camera: Camera,
  check: Check,
  'check-circle': CheckCircle2,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevrons-up-down': ChevronsUpDown,
  circle: Circle,
  'circle-dot': CircleDot,
  clipboard: Clipboard,
  clock: Clock,
  cloud: Cloud,
  code: Code,
  cog: Cog,
  copy: Copy,
  cpu: Cpu,
  database: Database,
  download: Download,
  edit: Edit,
  'external-link': ExternalLink,
  eye: Eye,
  'eye-off': EyeOff,
  file: File,
  'file-text': FileText,
  filter: Filter,
  flag: Flag,
  folder: Folder,
  'folder-open': FolderOpen,
  gauge: Gauge,
  globe: Globe,
  grid: Grid3x3,
  hash: Hash,
  heart: Heart,
  'help-circle': HelpCircle,
  history: History,
  home: Home,
  image: Image,
  inbox: Inbox,
  info: Info,
  key: Key,
  layers: Layers,
  layout: LayoutDashboard,
  link: Link,
  list: List,
  loader: Loader2,
  lock: Lock,
  'log-in': LogIn,
  'log-out': LogOut,
  mail: Mail,
  map: Map,
  maximize: Maximize2,
  menu: Menu,
  message: MessageCircle,
  microscope: Microscope,
  minimize: Minimize2,
  minus: Minus,
  monitor: Monitor,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  move: Move,
  network: Network,
  package: Package,
  paperclip: Paperclip,
  pause: Pause,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  power: Power,
  refresh: RefreshCw,
  rocket: Rocket,
  'rotate-ccw': RotateCcw,
  save: Save,
  search: Search,
  send: Send,
  server: Server,
  settings: Settings,
  share: Share2,
  shield: Shield,
  'skip-forward': SkipForward,
  sliders: Sliders,
  square: Square,
  star: Star,
  stop: StopCircle,
  table: Table,
  tag: Tag,
  terminal: Terminal,
  'thumbs-down': ThumbsDown,
  'thumbs-up': ThumbsUp,
  trash: Trash2,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  upload: Upload,
  user: User,
  'user-plus': UserPlus,
  users: Users,
  video: Video,
  wand: Wand2,
  workflow: Workflow,
  wrench: Wrench,
  x: X,
  'x-circle': XCircle,
  zap: Zap,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
} as const satisfies Record<string, LucideIcon>;

export type BlokIconName = keyof typeof BLOK_ICONS;

const ICON_NAMES = Object.keys(BLOK_ICONS) as [BlokIconName, ...BlokIconName[]];

export const iconNameSchema = z
  .enum(ICON_NAMES)
  .optional()
  .describe(`Icon name. One of: ${ICON_NAMES.join(', ')}.`);

// Let a `className` colour the glyph (`text-primary`), as it does on the web.
for (const icon of new Set<LucideIcon>(Object.values(BLOK_ICONS))) {
  iconWithClassName(icon);
}

/** The point size a Tailwind `size-N` / `h-N` class asks for, if any. */
const sizeFromClassName = (className?: string): number | undefined => {
  const match = className ? /(?:^|\s)(?:size|h|w)-(\d+(?:\.5)?)(?:\s|$)/.exec(className) : null;
  return match ? Number(match[1]) * 4 : undefined;
};

export type BlokIconProps = {
  name: unknown;
  size?: number;
  color?: string;
  className?: string;
};

/**
 * One allowlisted glyph, or nothing when the name is absent/unknown. Defaults
 * to 16 points in the foreground colour; a `className` may recolour it.
 */
export const BlokIcon = ({name, size, color, className}: BlokIconProps) => {
  const colors = useThemeColors();

  if (typeof name !== 'string' || !(name in BLOK_ICONS)) {
    return null;
  }

  const IconComponent = BLOK_ICONS[name as BlokIconName];
  return (
    <IconComponent
      size={size ?? sizeFromClassName(className) ?? 16}
      color={color ?? colors.foreground}
      className={className}
    />
  );
};

/** Renders an icon prop inline, or nothing when the name is absent/unknown. */
export const renderIcon = (name: unknown, options?: Omit<BlokIconProps, 'name'>) => {
  if (typeof name !== 'string' || !(name in BLOK_ICONS)) {
    return null;
  }

  return <BlokIcon name={name} {...options} />;
};

export const Icon = createBlokComponent(
  {
    name: 'Icon',
    schema: z
      .object({
        name: iconNameSchema,
        size: numberSchema.describe('Pixel size. Defaults to the surrounding text size.'),
        className: classNameSchema,
      })
      .describe('A lucide icon.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const name = useValue(blok.name);
    const size = useValue(blok.size);
    const className = useValue(blok.className);

    if (!name) {
      return null;
    }

    return <BlokIcon name={name} size={size} className={className} />;
  },
);

export const iconBlokComponents = [Icon];
