"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/Logo";

const MIN = 8;

/**
 * "Olvidé mi contraseña" · paso 2: poner la nueva.
 *
 * Acá se cae desde el link del mail. Supabase deja una sesión temporal en el
 * navegador, y con esa sesión se puede cambiar la contraseña.
 *
 * Por qué se espera en vez de mostrar el formulario de una: el cliente de
 * Supabase tarda un instante en leer el token que viene en la dirección. Si
 * mostráramos el formulario al toque, el "Guardar" podría dispararse antes de
 * que la sesión exista y fallaría sin motivo aparente.
 */
export default function NuevaPasswordPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<"esperando" | "listo" | "sin-sesion">("esperando");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let vivo = true;

    const { data: sub } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (!vivo) return;
      if (evento === "PASSWORD_RECOVERY" || sesion) setEstado("listo");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      if (data.session) setEstado("listo");
    });

    // Si en 6 segundos no apareció ninguna sesión, el link venció o se abrió
    // en otro navegador. Mejor decirlo que dejar la pantalla cargando.
    const t = window.setTimeout(() => {
      if (vivo) setEstado((e) => (e === "esperando" ? "sin-sesion" : e));
    }, 6000);

    return () => {
      vivo = false;
      window.clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  const coincide = nueva.length > 0 && nueva === repetir;
  const puede = nueva.length >= MIN && coincide && !loading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: nueva });
      if (error) {
        setError(traducir(error.message));
        return;
      }
      setOk(true);
      window.setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (e) {
      const detalle = e instanceof Error ? e.message : String(e);
      setError(`No pudimos guardarla. Detalle técnico: ${detalle}`);
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--canvas)" }}>
      <div className="w-full max-w-sm bg-surface border border-line rounded-xl3 shadow-lg2 p-6">
        <div className="mb-6 flex justify-center">
          <Logo size={40} />
        </div>

        {estado === "esperando" && (
          <p className="text-center text-[13px] text-muted">Verificando el link…</p>
        )}

        {estado === "sin-sesion" && (
          <div className="text-center">
            <h1 className="text-[17px] font-bold text-ink">Este link ya no sirve</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Puede haber vencido, haberse usado antes, o haberse abierto en un
              navegador distinto al que pidió el cambio. Pedí uno nuevo, es
              inmediato.
            </p>
            <Link
              href="/recuperar"
              className="mt-5 inline-block rounded-xl2 px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              Pedir otro link
            </Link>
          </div>
        )}

        {estado === "listo" && ok && (
          <div className="text-center">
            <h1 className="text-[17px] font-bold text-ink">Contraseña cambiada</h1>
            <p className="mt-2 text-[13px] text-muted">Entrando a tu sistema…</p>
          </div>
        )}

        {estado === "listo" && !ok && (
          <>
            <h1 className="mb-1 text-[17px] font-bold text-ink">Elegí tu contraseña nueva</h1>
            <p className="mb-5 text-[13px] leading-relaxed text-muted">
              Mínimo {MIN} caracteres. Mezclá mayúsculas, números y algún símbolo.
            </p>

            <form onSubmit={submit} className="grid gap-3.5">
              <label className="block">
                <span className="block text-[12.5px] font-semibold mb-1.5">Contraseña nueva</span>
                <input
                  className={input}
                  type={ver ? "text" : "password"}
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="block">
                <span className="block text-[12.5px] font-semibold mb-1.5">Repetir la nueva</span>
                <input
                  className={input}
                  type={ver ? "text" : "password"}
                  value={repetir}
                  onChange={(e) => setRepetir(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {repetir.length > 0 && !coincide && (
                  <span className="mt-1.5 block text-[12px]" style={{ color: "var(--rose)" }}>
                    Las dos no coinciden.
                  </span>
                )}
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-muted">
                <input
                  type="checkbox"
                  checked={ver}
                  onChange={(e) => setVer(e.target.checked)}
                  className="h-3.5 w-3.5 accent-teal"
                />
                Ver lo que escribo
              </label>

              {error && (
                <div
                  className="text-[12.5px] font-medium rounded-xl2 px-3 py-2"
                  style={{ background: "var(--rose-soft)", color: "var(--rose)" }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!puede}
                className="inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl2 py-2.5 text-sm text-white trans disabled:opacity-50"
                style={{ background: "var(--teal)" }}
              >
                {loading ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("should be different")) return "Tiene que ser distinta de la actual.";
  if (m.includes("at least")) return `Es demasiado corta (mínimo ${MIN} caracteres).`;
  if (m.includes("weak") || m.includes("pwned"))
    return "Esa contraseña aparece en listas de contraseñas filtradas. Elegí otra.";
  if (m.includes("session") || m.includes("jwt") || m.includes("token"))
    return "El link venció. Pedí uno nuevo desde “Olvidé mi contraseña”.";
  // El mensaje crudo entre paréntesis: si aparece uno que no tenemos
  // traducido, se ve cuál es en vez de quedar en la nada.
  return `No pudimos guardarla (${mensaje}).`;
}
