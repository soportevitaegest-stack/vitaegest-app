"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cerrarTodasLasSesiones } from "@/server/actions/cuenta";

/**
 * Cambio de contraseña desde el panel.
 *
 *   <CambiarPassword email={user.email!} />
 *
 * Por qué pide la contraseña actual: Supabase deja cambiarla solo con la sesión
 * abierta. Si alguien se levanta del escritorio sin bloquear la compu, cualquiera
 * le cambia la clave y la deja afuera de su propio sistema. Verificamos primero.
 *
 * La verificación usa un cliente descartable (persistSession: false) para no
 * pisar la sesión real mientras se comprueba la contraseña vieja.
 */

const MIN = 8;

export function CambiarPassword({ email }: { email: string }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  const fuerza = useMemo(() => medirFuerza(nueva), [nueva]);
  const coincide = nueva.length > 0 && nueva === repetir;
  const puedeEnviar =
    actual.length > 0 && nueva.length >= MIN && coincide && nueva !== actual && !cargando;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setCargando(true);

    try {
      // 1 · Verificar la contraseña actual sin tocar la sesión abierta.
      const verificador = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { error: errLogin } = await verificador.auth.signInWithPassword({
        email,
        password: actual,
      });
      if (errLogin) {
        setMsg({ tone: "error", text: "La contraseña actual no es correcta." });
        return;
      }
      await verificador.auth.signOut();

      // 2 · Cambiarla con la sesión real.
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: nueva });
      if (error) {
        setMsg({ tone: "error", text: traducir(error.message) });
        return;
      }

      setActual("");
      setNueva("");
      setRepetir("");
      setMsg({
        tone: "ok",
        text: "Listo. Tu contraseña quedó cambiada y tu sesión sigue abierta.",
      });
    } catch {
      setMsg({ tone: "error", text: "No pudimos cambiar la contraseña. Probá de nuevo." });
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="space-y-6">
      <form onSubmit={guardar} className="rounded-2xl border border-ink-line bg-white p-6 shadow-card">
        <h3 className="text-lg font-bold text-ink">Cambiar contraseña</h3>
        <p className="mt-1 max-w-lg text-sm text-ink-soft">
          Si entraste con una contraseña temporal, cambiala ahora. Mínimo {MIN}{" "}
          caracteres; mezclá mayúsculas, números y algún símbolo.
        </p>

        <div className="mt-6 max-w-md space-y-4">
          <Campo
            id="pw-actual"
            label="Contraseña actual"
            value={actual}
            onChange={setActual}
            type={ver ? "text" : "password"}
            autoComplete="current-password"
          />

          <div>
            <Campo
              id="pw-nueva"
              label="Contraseña nueva"
              value={nueva}
              onChange={setNueva}
              type={ver ? "text" : "password"}
              autoComplete="new-password"
            />
            {nueva.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1.5" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i < fuerza.nivel ? fuerza.color : "bg-ink-line"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-ink-faint" role="status">
                  {fuerza.texto}
                </p>
              </div>
            )}
          </div>

          <div>
            <Campo
              id="pw-repetir"
              label="Repetir la nueva"
              value={repetir}
              onChange={setRepetir}
              type={ver ? "text" : "password"}
              autoComplete="new-password"
            />
            {repetir.length > 0 && !coincide && (
              <p className="mt-1.5 text-xs text-coral-dark">Las dos no coinciden.</p>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={ver}
              onChange={(e) => setVer(e.target.checked)}
              className="h-4 w-4 accent-[#1ABC9C]"
            />
            Ver lo que escribo
          </label>
        </div>

        {msg && (
          <p
            role="status"
            className={`mt-5 max-w-md rounded-xl px-4 py-3 text-sm ${
              msg.tone === "ok"
                ? "bg-teal-soft text-primary-700"
                : "bg-coral-soft text-coral-dark"
            }`}
          >
            {msg.text}
          </p>
        )}

        <button type="submit" disabled={!puedeEnviar} className="btn-primary mt-6">
          {cargando ? "Cambiando…" : "Cambiar contraseña"}
        </button>
      </form>

      <div className="rounded-2xl border border-ink-line bg-white p-6 shadow-card">
        <h3 className="text-lg font-bold text-ink">Cerrar sesión en todos lados</h3>
        <p className="mt-1 max-w-lg text-sm text-ink-soft">
          Si entraste desde una compu prestada, del consultorio o perdiste el
          celular, esto cierra tu sesión en todos los dispositivos. Vas a tener
          que volver a entrar acá también.
        </p>
        {/* form y no onClick: el Server Action redirige (ver UserMenu.tsx) */}
        <form action={cerrarTodasLasSesiones} className="mt-4">
          <BotonCerrarTodo />
        </form>
      </div>
    </section>
  );
}

function BotonCerrarTodo() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-ghost">
      {pending ? "Cerrando…" : "Cerrar todas las sesiones"}
    </button>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  type,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-ink-line bg-canvas px-4 py-3 text-ink outline-none transition-colors focus:border-teal focus:bg-white"
      />
    </div>
  );
}

function medirFuerza(pw: string): { nivel: number; texto: string; color: string } {
  if (!pw) return { nivel: 0, texto: "", color: "bg-ink-line" };
  let n = 0;
  if (pw.length >= MIN) n++;
  if (pw.length >= 12) n++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) n++;

  if (pw.length < MIN) return { nivel: 1, texto: `Muy corta: mínimo ${MIN} caracteres.`, color: "bg-coral" };
  if (n <= 2) return { nivel: 2, texto: "Débil. Agregá mayúsculas y números.", color: "bg-coral" };
  if (n === 3) return { nivel: 3, texto: "Aceptable.", color: "bg-teal" };
  return { nivel: 4, texto: "Buena.", color: "bg-teal" };
}

function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("should be different")) return "La contraseña nueva tiene que ser distinta de la actual.";
  if (m.includes("at least")) return `La contraseña es demasiado corta (mínimo ${MIN} caracteres).`;
  if (m.includes("weak") || m.includes("pwned"))
    return "Esa contraseña aparece en listas de contraseñas filtradas. Elegí otra.";
  if (m.includes("reauthentication")) return "Por seguridad, volvé a iniciar sesión y probá de nuevo.";
  return "No pudimos cambiar la contraseña. Probá de nuevo.";
}
