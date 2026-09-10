// Set mínimo de íconos (SVG inline, sin dependencias) para el layout base.
type P = { size?: number; className?: string };
const S = ({ size = 20, className, d }: P & { d: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {d}
  </svg>
);

export const IconHome = (p: P) => (
  <S {...p} d={<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>} />
);
export const IconCalendar = (p: P) => (
  <S {...p} d={<><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></>} />
);
export const IconUsers = (p: P) => (
  <S {...p} d={<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-2-4.3" /></>} />
);
export const IconBill = (p: P) => (
  <S {...p} d={<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></>} />
);
export const IconGear = (p: P) => (
  <S {...p} d={<><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7" /></>} />
);

export const NAV_ICONS: Record<string, (p: P) => React.ReactNode> = {
  home: IconHome,
  calendar: IconCalendar,
  users: IconUsers,
  bill: IconBill,
  gear: IconGear,
};
