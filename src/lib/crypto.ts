import "server-only";
import crypto from "node:crypto";

/**
 * Cifrado simétrico para secretos que van a la base (hoy: el Access Token de
 * Mercado Pago de cada profesional).
 *
 * AES-256-GCM: además de cifrar, detecta si alguien tocó el dato.
 * Formato guardado:  v1.<iv-b64>.<tag-b64>.<cipher-b64>
 *
 * Requiere la variable de entorno VITAEGEST_SECRET_KEY con 32 bytes en base64.
 * Generala una vez y cargala en Vercel (Production + Preview):
 *
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Si la rotás, los tokens ya guardados dejan de poder descifrarse y cada
 * profesional tiene que volver a conectar su cuenta. No la pierdas.
 */

const VERSION = "v1";

function key(): Buffer {
  const raw = process.env.VITAEGEST_SECRET_KEY;
  if (!raw) {
    throw new Error(
      "Falta VITAEGEST_SECRET_KEY. Generala con: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("VITAEGEST_SECRET_KEY tiene que ser de 32 bytes en base64.");
  }
  return buf;
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("El secreto guardado tiene un formato que no reconozco.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Para mostrar en pantalla sin exponer el secreto: "APP_USR-…9f2c". */
export function maskSecret(plain: string): string {
  if (plain.length <= 12) return "•".repeat(plain.length);
  return `${plain.slice(0, 8)}…${plain.slice(-4)}`;
}
