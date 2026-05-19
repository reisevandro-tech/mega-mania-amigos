import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_PWD = 256;

function checkPassword(pwd: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Hash both sides to fixed-width 32-byte digests so the comparison
  // is constant-time and reveals nothing about the secret's length.
  const a = createHash("sha256").update(pwd).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// In-memory rate limit (per worker instance). Best-effort throttle.
type Bucket = { count: number; resetAt: number; blockedUntil: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
const BLOCK_MS = 5 * 60_000;

function getClientIp(): string {
  try {
    const req = getRequest();
    const h = req?.headers;
    const ip =
      h?.get("cf-connecting-ip") ||
      h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h?.get("x-real-ip") ||
      "unknown";
    return ip;
  } catch {
    return "unknown";
  }
}

function rateLimit(): { ok: true } | { ok: false; retryAfter: number } {
  const ip = getClientIp();
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS, blockedUntil: 0 };
    buckets.set(ip, b);
  }
  if (b.blockedUntil > now) {
    return { ok: false, retryAfter: Math.ceil((b.blockedUntil - now) / 1000) };
  }
  b.count += 1;
  if (b.count > MAX_ATTEMPTS) {
    b.blockedUntil = now + BLOCK_MS;
    return { ok: false, retryAfter: Math.ceil(BLOCK_MS / 1000) };
  }
  // Opportunistic cleanup
  if (buckets.size > 1000) {
    for (const [k, v] of buckets) {
      if (v.resetAt < now && v.blockedUntil < now) buckets.delete(k);
    }
  }
  return { ok: true };
}

function logFailedAttempt(reason: string) {
  console.warn(`[admin-auth] failed: ${reason} ip=${getClientIp()}`);
}

const PwdSchema = z.object({ password: z.string().min(1).max(MAX_PWD) });

export const verifyAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PwdSchema.parse(d))
  .handler(async ({ data }) => {
    const rl = rateLimit();
    if (!rl.ok) {
      throw new Error(`Muitas tentativas. Tente novamente em ${rl.retryAfter}s.`);
    }
    const ok = checkPassword(data.password);
    if (!ok) logFailedAttempt("verifyAdmin");
    return { ok };
  });

export const getAdminData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PwdSchema.parse(d))
  .handler(async ({ data }) => {
    const rl = rateLimit();
    if (!rl.ok) {
      throw new Error(`Muitas tentativas. Tente novamente em ${rl.retryAfter}s.`);
    }
    if (!checkPassword(data.password)) {
      logFailedAttempt("getAdminData");
      throw new Error("Senha inválida");
    }
    const { data: rows, error } = await supabaseAdmin
      .from("palpites")
      .select("id, nome, cpf, dezenas, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const counts = new Map<number, number>();
    for (const r of rows ?? []) {
      for (const n of (r.dezenas as number[]) ?? []) {
        counts.set(n, (counts.get(n) ?? 0) + 1);
      }
    }
    const ranking = Array.from(counts.entries())
      .map(([dezena, total]) => ({ dezena, total }))
      .sort((a, b) => b.total - a.total || a.dezena - b.dezena);

    return {
      participantes: rows ?? [],
      total: rows?.length ?? 0,
      ranking,
    };
  });
