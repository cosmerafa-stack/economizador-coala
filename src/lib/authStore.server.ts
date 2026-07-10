import "server-only";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL as string);

const SESSION_ACTIVE_WINDOW_MS = 15 * 60 * 1000; // a device counts as "connected" if it pinged in the last 15 min

interface AccountRow {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string;
  password_hash: string;
  approved: boolean;
  max_devices: number;
  created_at: string;
}

interface SessionRow {
  token: string;
  account_id: string;
  device_id: string;
  login_at: string;
  last_seen_at: string;
}

function isSessionRowActive(session: SessionRow): boolean {
  return Date.now() - new Date(session.last_seen_at).getTime() < SESSION_ACTIVE_WINDOW_MS;
}

async function countActiveDevices(accountId: string, excludeDeviceId?: string): Promise<number> {
  const sessions = (await sql.query(
    "select device_id, last_seen_at from revendedor_sessions where account_id = $1",
    [accountId]
  )) as Pick<SessionRow, "device_id" | "last_seen_at">[];

  const ids = new Set<string>();
  for (const s of sessions) {
    if (excludeDeviceId && s.device_id === excludeDeviceId) continue;
    if (isSessionRowActive(s as SessionRow)) ids.add(s.device_id);
  }
  return ids.size;
}

async function toPublic(account: AccountRow) {
  return {
    id: account.id,
    nome: account.nome,
    sobrenome: account.sobrenome,
    telefone: account.telefone,
    email: account.email,
    approved: account.approved,
    maxDevices: account.max_devices,
    activeDevices: await countActiveDevices(account.id),
    createdAt: account.created_at,
  };
}

export async function registerAccount(input: {
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string;
  senha: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const emailNormalized = input.email.trim().toLowerCase();

  const existing = (await sql.query(
    "select id from revendedor_accounts where email = $1",
    [emailNormalized]
  )) as { id: string }[];
  if (existing.length > 0) {
    return { ok: false, message: "Já existe um cadastro com este e-mail." };
  }

  const passwordHash = await bcrypt.hash(input.senha, 10);

  await sql.query(
    `insert into revendedor_accounts (nome, sobrenome, telefone, email, password_hash)
     values ($1, $2, $3, $4, $5)`,
    [input.nome.trim(), input.sobrenome.trim(), input.telefone.trim(), emailNormalized, passwordHash]
  );

  return { ok: true };
}

export async function login(input: {
  email: string;
  senha: string;
  deviceId: string;
}): Promise<
  | { ok: true; token: string; nome: string }
  | { ok: false; message: string }
> {
  const emailNormalized = input.email.trim().toLowerCase();
  const accounts = (await sql.query(
    "select * from revendedor_accounts where email = $1",
    [emailNormalized]
  )) as AccountRow[];
  const account = accounts[0];

  if (!account) {
    return { ok: false, message: "E-mail ou senha incorretos." };
  }

  const match = await bcrypt.compare(input.senha, account.password_hash);
  if (!match) {
    return { ok: false, message: "E-mail ou senha incorretos." };
  }

  if (!account.approved) {
    return {
      ok: false,
      message: "Seu cadastro ainda está em análise. Aguarde a aprovação.",
    };
  }

  const othersCount = await countActiveDevices(account.id, input.deviceId);
  if (othersCount >= account.max_devices) {
    return {
      ok: false,
      message: `Limite de ${account.max_devices} dispositivo(s) simultâneo(s) atingido para esta conta.`,
    };
  }

  // Clear any stale session for this exact device, then open a fresh one.
  await sql.query("delete from revendedor_sessions where device_id = $1", [input.deviceId]);
  const token = `tok-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await sql.query(
    "insert into revendedor_sessions (token, account_id, device_id) values ($1, $2, $3)",
    [token, account.id, input.deviceId]
  );

  return { ok: true, token, nome: account.nome };
}

export async function heartbeat(token: string): Promise<boolean> {
  const result = (await sql.query(
    "update revendedor_sessions set last_seen_at = now() where token = $1 returning token",
    [token]
  )) as { token: string }[];
  return result.length > 0;
}

export async function logout(token: string): Promise<void> {
  await sql.query("delete from revendedor_sessions where token = $1", [token]);
}

export async function listAccounts(): Promise<Awaited<ReturnType<typeof toPublic>>[]> {
  const accounts = (await sql.query(
    "select * from revendedor_accounts order by created_at desc"
  )) as AccountRow[];
  return Promise.all(accounts.map(toPublic));
}

export async function approveAccount(id: string): Promise<boolean> {
  const result = (await sql.query(
    "update revendedor_accounts set approved = true where id = $1 returning id",
    [id]
  )) as { id: string }[];
  return result.length > 0;
}

export async function setMaxDevices(id: string, maxDevices: number): Promise<boolean> {
  const value = Math.max(1, Math.floor(maxDevices));
  const result = (await sql.query(
    "update revendedor_accounts set max_devices = $1 where id = $2 returning id",
    [value, id]
  )) as { id: string }[];
  return result.length > 0;
}

export async function removeAccount(id: string): Promise<boolean> {
  const result = (await sql.query(
    "delete from revendedor_accounts where id = $1 returning id",
    [id]
  )) as { id: string }[];
  return result.length > 0;
}
