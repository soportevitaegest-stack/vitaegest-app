"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logExercise, doCheckin } from "@/server/actions/portal";
import type { PortalContext } from "@/types/portal";

const card = "bg-surface border border-line rounded-xl3 shadow-soft p-5";

export function PortalExercises({ token, ctx }: { token: string; ctx: PortalContext }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const doneToday = useMemo(
    () => new Set(ctx.logs_today.filter((l) => l.completed).map((l) => l.item_id)),
    [ctx.logs_today]
  );
  const items = useMemo(() => [...ctx.items].sort((a, b) => a.sort - b.sort), [ctx.items]);
  const done = items.filter((i) => doneToday.has(i.id)).length;

  const [mood, setMood] = useState("");
  const [checkinOk, setCheckinOk] = useState(false);

  const toggle = (itemId: string, completed: boolean) =>
    start(async () => {
      const res = await logExercise(token, itemId, completed, "", "");
      if (res.error) { alert(res.error); return; }
      router.refresh();
    });

  const sendCheckin = (m: string) =>
    start(async () => {
      setMood(m);
      const res = await doCheckin(token, m, "");
      if (res.error) { alert(res.error); return; }
      setCheckinOk(true);
      router.refresh();
    });

  if (!ctx.plan || items.length === 0) {
    return (
      <div className={card}>
        <h2 className="font-display font-bold text-[15px] mb-1">Plan de ejercicios</h2>
        <p className="text-[13px] text-muted">Todavía no tenés un plan asignado. Tu kinesiólogo/a lo va a cargar pronto.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-bold text-[15px]">{ctx.plan.title}</h2>
            <p className="text-[12.5px] text-muted">{done} de {items.length} hechos hoy</p>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-display font-bold text-[13px]"
            style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}>
            {Math.round((done / items.length) * 100)}%
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {items.map((it) => {
            const isDone = doneToday.has(it.id);
            return (
              <button
                key={it.id}
                onClick={() => toggle(it.id, !isDone)}
                disabled={pending}
                className="flex items-center gap-3 text-left rounded-xl2 border p-3 trans disabled:opacity-60"
                style={isDone
                  ? { background: "var(--emerald-soft)", borderColor: "transparent" }
                  : { background: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] shrink-0 border-2"
                  style={isDone
                    ? { background: "var(--emerald-ink)", borderColor: "var(--emerald-ink)", color: "#fff" }
                    : { borderColor: "var(--border)", color: "transparent" }}
                >
                  ✓
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-semibold">{it.name}</span>
                  {it.detail && <span className="block text-[12px] text-muted">{it.detail}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Check-in de estado del día */}
      <div className={card}>
        <h3 className="font-display font-bold text-[14px] mb-2.5">¿Cómo te sentís hoy?</h3>
        {checkinOk ? (
          <p className="text-[13px] font-medium" style={{ color: "var(--emerald-ink)" }}>✓ ¡Gracias! Registramos cómo te sentís hoy.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {[["Bien", "🙂"], ["Regular", "😐"], ["Mal", "☹️"]].map(([m, e]) => (
              <button
                key={m}
                onClick={() => sendCheckin(m)}
                disabled={pending}
                className="rounded-xl2 border border-line py-3 text-[13px] font-semibold trans hover:border-primary disabled:opacity-50"
                style={mood === m ? { background: "var(--primary-soft)", color: "var(--primary-ink)" } : { background: "var(--surface-2)" }}
              >
                <span className="block text-xl leading-none mb-1">{e}</span>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
