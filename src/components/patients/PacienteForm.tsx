"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { actualizarPaciente, type EstadoForm } from "@/server/actions/patients-edit";

export type Paciente = {
  id: string;
  first_name: string;
  last_name: string;
  document_id: string | null;
  birth_date: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  medical_history: string | null;
  allergies: string | null;
  notes: string | null;
  is_active: boolean;
};

const inicial: EstadoForm = { ok: false };

export function PacienteForm({ paciente }: { paciente: Paciente }) {
  const [estado, formAction] = useFormState(actualizarPaciente, inicial);
  const e = estado.campos ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={paciente.id} />

      {estado.error && (
        <p
          role="alert"
          className="rounded-xl bg-coral-soft dark:bg-red-950/30 px-4 py-3 text-sm text-coral-dark dark:text-red-400"
        >
          {estado.error}
        </p>
      )}

      {/* ── Datos personales ─────────────────────────────────────────────── */}
      <fieldset className="rounded-2xl border border-ink-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-card">
        <legend className="px-2 text-sm font-bold uppercase tracking-wide text-primary dark:text-teal-400">
          Datos personales
        </legend>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Campo
            name="first_name"
            label="Nombre"
            defaultValue={paciente.first_name}
            error={e.first_name}
            required
            autoComplete="given-name"
          />
          <Campo
            name="last_name"
            label="Apellido"
            defaultValue={paciente.last_name}
            error={e.last_name}
            required
            autoComplete="family-name"
          />
          <Campo
            name="document_id"
            label="Documento"
            defaultValue={paciente.document_id}
            inputMode="numeric"
          />
          <Campo
            name="birth_date"
            label="Fecha de nacimiento"
            type="date"
            defaultValue={paciente.birth_date}
            error={e.birth_date}
          />

          <div>
            <label htmlFor="sex" className="text-sm font-semibold text-ink dark:text-zinc-200">
              Sexo
            </label>
            <select
              id="sex"
              name="sex"
              defaultValue={paciente.sex ?? ""}
              className="mt-1.5 w-full rounded-xl border border-ink-line dark:border-zinc-700 bg-canvas dark:bg-zinc-950 px-4 py-3 text-ink dark:text-zinc-100 outline-none transition-colors focus:border-teal dark:focus:border-teal-500 focus:bg-white dark:focus:bg-zinc-900"
            >
              <option value="">Sin especificar</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
              <option value="X">Otro</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* ── Contacto ─────────────────────────────────────────────────────── */}
      <fieldset className="rounded-2xl border border-ink-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-card">
        <legend className="px-2 text-sm font-bold uppercase tracking-wide text-primary dark:text-teal-400">
          Contacto
        </legend>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Campo
            name="phone"
            label="Celular"
            type="tel"
            inputMode="tel"
            defaultValue={paciente.phone}
            hint="Con código de país si podés: +54 9 11 5000-1111"
            autoComplete="tel"
          />
          <Campo
            name="email"
            label="Email"
            type="email"
            defaultValue={paciente.email}
            error={e.email}
            autoComplete="email"
          />
          <div className="sm:col-span-2">
            <Campo name="address" label="Dirección" defaultValue={paciente.address} />
          </div>
        </div>
      </fieldset>

      {/* ── Clínico ──────────────────────────────────────────────────────── */}
      <fieldset className="rounded-2xl border border-ink-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-card">
        <legend className="px-2 text-sm font-bold uppercase tracking-wide text-primary dark:text-teal-400">
          Antecedentes
        </legend>

        <div className="mt-4 space-y-5">
          <Area
            name="medical_history"
            label="Antecedentes"
            defaultValue={paciente.medical_history}
            rows={3}
          />
          <Area name="allergies" label="Alergias" defaultValue={paciente.allergies} rows={2} />
          <Area name="notes" label="Observaciones" defaultValue={paciente.notes} rows={3} />
        </div>
      </fieldset>

      {/* ── Estado ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-ink-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-card">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={paciente.is_active}
            className="mt-0.5 h-4 w-4 accent-[#1ABC9C]"
          />
          <span>
            <span className="block text-sm font-semibold text-ink dark:text-zinc-200">Paciente activa</span>
            <span className="mt-0.5 block text-sm text-ink-soft dark:text-zinc-400">
              Al desmarcarla deja de aparecer en los listados, pero su historia
              clínica se conserva entera.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <BotonGuardar />
        <Link href={`/pacientes/${paciente.id}`} className="btn-ghost dark:text-zinc-300 dark:hover:bg-zinc-800">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}

function Campo({
  name,
  label,
  defaultValue,
  type = "text",
  hint,
  error,
  required,
  inputMode,
  autoComplete,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  inputMode?: "text" | "numeric" | "tel" | "email";
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-ink dark:text-zinc-200">
        {label} {required && <span className="text-coral dark:text-red-400">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-ink-faint dark:text-zinc-500">{hint}</p>}
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-canvas dark:bg-zinc-950 px-4 py-3 text-ink dark:text-zinc-100 outline-none transition-colors focus:bg-white dark:focus:bg-zinc-900 ${
          error ? "border-coral dark:border-red-500 focus:border-coral dark:focus:border-red-500" : "border-ink-line dark:border-zinc-700 focus:border-teal dark:focus:border-teal-500"
        }`}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-xs text-coral-dark dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function Area({
  name,
  label,
  defaultValue,
  rows,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-ink dark:text-zinc-200">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="mt-1.5 w-full resize-y rounded-xl border border-ink-line dark:border-zinc-700 bg-canvas dark:bg-zinc-950 px-4 py-3 text-ink dark:text-zinc-100 outline-none transition-colors focus:border-teal dark:focus:border-teal-500 focus:bg-white dark:focus:bg-zinc-900"
      />
    </div>
  );
}
