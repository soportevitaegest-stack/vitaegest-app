"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/Logo";

// Login mínimo (email + contraseña) contra Supabase Auth.
// El middleware redirige acá cuando no hay sesión; al entrar, va a "/".
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("No pudimos iniciar sesión. Revisá el email y la contraseña.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  const input =
    "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--canvas)" }}>
      <div className="w-full max-w-sm bg-surface border border-line rounded-xl3 shadow-lg2 p-6">
        <div className="mb-6 flex justify-center">
          <Logo size={40} />
        </div>
        <form onSubmit={submit} className="grid gap-3.5">
          <label className="block">
            <span className="block text-[12.5px] font-semibold mb-1.5">Email</span>
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold mb-1.5">Contraseña</span>
            {/* Se puede ver lo escrito: las contraseñas temporales se entregan por
                WhatsApp y se tipean a mano. Sin esto, un carácter mal puesto se
                lee como "contraseña incorrecta" y no hay forma de detectarlo. */}
            <input
              className={input}
              type={ver ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
            <div className="text-[12.5px] font-medium rounded-xl2 px-3 py-2" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl2 py-2.5 text-sm text-white trans disabled:opacity-50"
            style={{ background: "var(--teal)" }}
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-[12.5px]">
          <Link href="/recuperar" className="font-medium text-muted hover:text-ink">
            Olvidé mi contraseña
          </Link>
        </p>
      </div>
    </div>
  );
}
