import { ThemeToggle } from "./ThemeToggle";

// Encabezado superior del área privada. El título lo define cada página vía props.
export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="shrink-0 border-b border-line bg-surface px-5 md:px-7 py-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-extrabold text-lg md:text-xl leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      <ThemeToggle />
    </header>
  );
}
