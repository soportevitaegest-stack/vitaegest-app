"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/Logo";

/**
 * "Olvidé mi contraseña" · paso 1: pedir el mail con el link.
 *
 * Supabase manda el mail y, al tocarlo, la persona vuelve a /nueva-password
 * con una sesión temporal que le permite cambiarla.
 */
export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-password`,
    });

    setLoading(false);

    /* Se muestra el mismo mensaje exista o no la cuenta. Si dijéramos "ese mail
       no está registrado", cualquiera podría averiguar quiénes son clientas
       probando direcciones. */
    if (error && !/rate|seconds|60/i.test(error.message)) {
      setError("No pudimos enviar el mail. Probá de nuevo en un minuto.");
      return;
    }
    setEnviado(true);
  };

  const input =
    "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--canvas)" }}>
      <div className="w-full max-w-sm bg-surface border border-line rounded-xl3 shadow-lg2 p-6">
        <div className="mb-6 flex justify-center">
          <Logo size={40} />
        </div>

        {enviado ? (
          <div className="text-center">
            <h1 className="text-[17px] font-bold text-ink">Revisá tu correo</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Si <strong className="text-ink">{email}</strong> tiene una cuenta,
              le acaba de llegar un mail con el link para poner una contraseña
              nueva. Puede tardar un par de minutos; si no lo ves, mirá en
              correo no deseado.
            </p>
            <p className="mt-3 text-[12.5px] text-muted">
              Abrí el link en <strong className="text-ink">este mismo navegador</strong>.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block text-[12.5px] font-medium text-muted hover:text-ink"
            >
              Volver a ingresar
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-[17px] font-bold text-ink">
              Recuperar contraseña
            </h1>
            <p className="mb-5 text-[13px] leading-relaxed text-muted">
              Poné tu email y te mandamos un link para elegir una nueva.
            </p>

            <form onSubmit={submit} className="grid gap-3.5">
              <label className="block">
                <span className="block text-[12.5px] font-semibold mb-1.5">Email</span>
                <input
                  className={input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
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
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl2 py-2.5 text-sm text-white trans disabled:opacity-50"
                style={{ background: "var(--teal)" }}
              >
                {loading ? "Enviando…" : "Enviarme el link"}
              </button>
            </form>

            <p className="mt-4 text-center text-[12.5px]">
              <Link href="/login" className="font-medium text-muted hover:text-ink">
                Volver a ingresar
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
