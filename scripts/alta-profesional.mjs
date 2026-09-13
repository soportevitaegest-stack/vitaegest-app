#!/usr/bin/env node
/**
 * VitaeGest · Alta de profesional (Super Admin)
 * -------------------------------------------------------------------------
 * Crea un usuario limpio en el proyecto de PRODUCCIÓN y le configura la
 * especialidad de entrada, para que su panel venga ya filtrado.
 *
 * NO forma parte de la app desplegada: se corre a mano, localmente, con la
 * service_role key (que NUNCA debe estar en Vercel ni en el bundle del front).
 *
 * Requisitos:
 *   npm i @supabase/supabase-js
 *   export SUPABASE_URL="https://<proyecto>.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"   # Settings → API
 *
 * Uso:
 *   node scripts/alta-profesional.mjs \
 *     --email dra.lopez@mail.com \
 *     --nombre "Klga. Ana López" \
 *     --especialidad ambas \
 *     [--matricula "M.N. 12345"] [--consultorio "Centro Kinésico"] [--password "Temporal123"]
 *
 * --especialidad: uro | dermato | ambas
 * -------------------------------------------------------------------------
 */
import { createClient } from "@supabase/supabase-js";

// -- Parseo de argumentos --
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) args[a.slice(2)] = process.argv[++i];
}

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function die(msg) {
  console.error("\n✖ " + msg + "\n");
  process.exit(1);
}

if (!URL || !KEY) die("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
if (!args.email) die("Falta --email");
if (!args.nombre) die("Falta --nombre");

const MAP = {
  uro: ["pelvic_perineal"],
  dermato: ["dermatofunctional"],
  ambas: ["pelvic_perineal", "dermatofunctional"],
};
const esp = (args.especialidad || "").toLowerCase();
if (!MAP[esp]) die('--especialidad debe ser: uro | dermato | ambas');
const specialties = MAP[esp];

const password = args.password || "Vitae-" + Math.random().toString(36).slice(2, 8) + "!";

const supabase = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserByEmail(email) {
  // Paginado simple (suficiente para beta).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email || "").toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  const email = args.email.trim();
  console.log(`\n▶ Alta de profesional: ${email} (especialidad: ${esp})`);

  // 1) Crear el usuario (o reutilizar si ya existe).
  let userId;
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // sin paso de verificación por mail
    user_metadata: { full_name: args.nombre },
  });

  if (createErr) {
    const existing = await findUserByEmail(email);
    if (!existing) die("No se pudo crear el usuario: " + createErr.message);
    userId = existing.id;
    console.log("• El usuario ya existía; se actualizan sus datos.");
  } else {
    userId = created.user.id;
    console.log("• Usuario creado.");
  }

  // 2) Asegurar la fila en professionals (el trigger on_auth_user_created ya la
  //    crea; si hubo carrera, upsert por las dudas).
  await supabase.from("professionals").upsert(
    { id: userId, full_name: args.nombre },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // 3) Configurar perfil + especialidad (esto filtra el panel).
  const { error: updErr } = await supabase
    .from("professionals")
    .update({
      full_name: args.nombre,
      specialties,
      license_number: args.matricula || null,
      clinic_name: args.consultorio || null,
    })
    .eq("id", userId);
  if (updErr) die("No se pudo configurar el perfil: " + updErr.message);

  console.log("• Perfil y especialidad configurados.");
  console.log("\n✔ LISTO. Entregale estas credenciales al profesional:");
  console.log("   ─────────────────────────────────────────────");
  console.log("   URL:          " + URL.replace(".supabase.co", "") + "  (usá el dominio de la app en Vercel)");
  console.log("   Email:        " + email);
  console.log("   Contraseña:   " + password + "   (pedile que la cambie)");
  console.log("   Especialidad: " + esp + "  → " + specialties.join(", "));
  console.log("   ─────────────────────────────────────────────\n");
}

main().catch((e) => die(e.message || String(e)));
