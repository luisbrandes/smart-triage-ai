import {
  Activity,
  Accessibility,
  ArrowRight,
  Check,
  ChevronLeft,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  HeartPulse,
  Home,
  Info,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Menu,
  MonitorCog,
  Settings,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  UsersRound,
  Volume2,
  X,
  type LucideIcon,
} from "lucide-react";

const icons = {
  accessibility: Accessibility,
  activity: Activity,
  arrowRight: ArrowRight,
  check: Check,
  back: ChevronLeft,
  alert: CircleAlert,
  clipboard: ClipboardCheck,
  clock: Clock3,
  fileCheck: FileCheck2,
  pulse: HeartPulse,
  home: Home,
  info: Info,
  overview: LayoutDashboard,
  queue: ListChecks,
  privacy: LockKeyhole,
  menu: Menu,
  development: MonitorCog,
  settings: Settings,
  reset: RotateCcw,
  shield: ShieldCheck,
  sparkle: Sparkles,
  nursing: Stethoscope,
  patient: UserRound,
  review: UsersRound,
  volume: Volume2,
  close: X,
  referral: ArrowRight,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  label?: string;
};

export function Icon({ name, size = 20, className, label }: IconProps) {
  const Component = icons[name];

  return (
    <Component
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      size={size}
      strokeWidth={1.8}
    />
  );
}
