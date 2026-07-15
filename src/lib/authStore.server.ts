import "server-only";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { TempAccountPublic } from "./types";
import { getDefaultTrialHours } from "./appSettings.server";

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
  google_sub: string | null;
  avatar_url: string | null;
  is_temp: boolean;
  expires_at: string | null;
  disabled_at: string | null;
  must_change_password: boolean;
  welcome_shown: boolean;
  tutorial_prompt_shown: boolean;
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

export interface LoginSuccess {
  ok: true;
  token: string;
  nome: string;
  mustChangePassword: boolean;
  isTemp: boolean;
  expiresAt: string | null;
  welcomeShown: boolean;
  tutorialPromptShown: boolean;
}

async function createSessionForApprovedAccount(
  account: AccountRow,
  deviceId: string
): Promise<LoginSuccess | { ok: false; message: string }> {
  if (account.disabled_at) {
    return { ok: false, message: "Este acesso foi desativado. Entre em contato com o suporte." };
  }

  if (account.is_temp && account.expires_at && new Date(account.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      message: "Seu período de teste expirou. Entre em contato para continuar usando.",
    };
  }

  if (!account.approved) {
    return {
      ok: false,
      message: "Seu cadastro ainda está em análise. Aguarde a aprovação.",
    };
  }

  const othersCount = await countActiveDevices(account.id, deviceId);
  if (othersCount >= account.max_devices) {
    return {
      ok: false,
      message: `Limite de ${account.max_devices} dispositivo(s) simultâneo(s) atingido para esta conta.`,
    };
  }

  // Clear any stale session for this exact device, then open a fresh one.
  // crypto.randomUUID() — not Math.random(), which isn't cryptographically
  // secure and would make session tokens theoretically guessable.
  await sql.query("delete from revendedor_sessions where device_id = $1", [deviceId]);
  const token = `tok-${crypto.randomUUID()}`;
  await sql.query(
    "insert into revendedor_sessions (token, account_id, device_id) values ($1, $2, $3)",
    [token, account.id, deviceId]
  );

  return {
    ok: true,
    token,
    nome: account.nome,
    mustChangePassword: account.must_change_password,
    isTemp: account.is_temp,
    expiresAt: account.expires_at,
    welcomeShown: account.welcome_shown,
    tutorialPromptShown: account.tutorial_prompt_shown,
  };
}

export async function login(input: {
  email: string;
  senha: string;
  deviceId: string;
}): Promise<LoginSuccess | { ok: false; message: string }> {
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

  return createSessionForApprovedAccount(account, input.deviceId);
}

// "Continuar com o Google" — verifies the ID token server-side (route
// handler does that) and passes us the already-trusted claims. Links to an
// existing account by email on first use, or creates a new one (still
// gated by the same gestor-approval workflow as a normal cadastro).
export async function loginOrRegisterWithGoogle(input: {
  googleSub: string;
  email: string;
  nome: string;
  sobrenome: string;
  avatarUrl: string | null;
  deviceId: string;
}): Promise<LoginSuccess | { ok: false; message: string; pending?: boolean }> {
  const emailNormalized = input.email.trim().toLowerCase();

  const bySub = (await sql.query(
    "select * from revendedor_accounts where google_sub = $1",
    [input.googleSub]
  )) as AccountRow[];
  let account = bySub[0];

  if (!account) {
    const byEmail = (await sql.query(
      "select * from revendedor_accounts where email = $1",
      [emailNormalized]
    )) as AccountRow[];
    account = byEmail[0];

    if (account) {
      // Existing password-based account signing in with Google for the
      // first time — link it instead of creating a duplicate.
      await sql.query(
        "update revendedor_accounts set google_sub = $1, avatar_url = coalesce(avatar_url, $2) where id = $3",
        [input.googleSub, input.avatarUrl, account.id]
      );
    }
  }

  if (!account) {
    // Brand new account. No password will ever be set for it, so give
    // password_hash an unusable random value rather than relaxing the
    // not-null constraint.
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const inserted = (await sql.query(
      `insert into revendedor_accounts
         (nome, sobrenome, telefone, email, password_hash, google_sub, avatar_url)
       values ($1, $2, '', $3, $4, $5, $6)
       returning *`,
      [
        input.nome.trim() || "Revendedor",
        input.sobrenome.trim(),
        emailNormalized,
        passwordHash,
        input.googleSub,
        input.avatarUrl,
      ]
    )) as AccountRow[];
    account = inserted[0];

    return {
      ok: false,
      pending: true,
      message: "Cadastro criado com sua conta Google. Aguarde a aprovação do gestor.",
    };
  }

  return createSessionForApprovedAccount(account, input.deviceId);
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
    "select * from revendedor_accounts where is_temp = false order by created_at desc"
  )) as AccountRow[];
  return Promise.all(accounts.map(toPublic));
}

// ===================== Contas temporárias (demo) =====================

function usernameToEmail(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas de combinação do NFD)
    .replace(/[^a-z0-9._-]/g, "");
}

export async function createTempAccount(input: {
  username: string;
  trialHours?: number;
}): Promise<{ ok: true; username: string } | { ok: false; message: string }> {
  const username = usernameToEmail(input.username);
  if (!username) {
    return { ok: false, message: "Nome de usuário inválido." };
  }

  const existing = (await sql.query(
    "select id from revendedor_accounts where email = $1",
    [username]
  )) as { id: string }[];
  if (existing.length > 0) {
    return { ok: false, message: "Já existe um usuário com esse nome." };
  }

  const trialHours = input.trialHours ?? (await getDefaultTrialHours());
  const passwordHash = await bcrypt.hash("123", 10);
  const expiresAt = new Date(Date.now() + trialHours * 60 * 60 * 1000);

  await sql.query(
    `insert into revendedor_accounts
       (nome, sobrenome, telefone, email, password_hash, approved, is_temp, expires_at, must_change_password)
     values ($1, '', '', $2, $3, true, true, $4, true)`,
    [username, username, passwordHash, expiresAt.toISOString()]
  );

  return { ok: true, username };
}

function toTempPublic(account: AccountRow): TempAccountPublic {
  const remainingMs = account.expires_at
    ? new Date(account.expires_at).getTime() - Date.now()
    : null;
  return {
    id: account.id,
    username: account.email,
    createdAt: account.created_at,
    expiresAt: account.expires_at,
    disabled: Boolean(account.disabled_at),
    mustChangePassword: account.must_change_password,
    remainingMs,
  };
}

export async function listTempAccounts(): Promise<TempAccountPublic[]> {
  const accounts = (await sql.query(
    "select * from revendedor_accounts where is_temp = true order by created_at desc"
  )) as AccountRow[];
  return accounts.map(toTempPublic);
}

export async function disableAccount(id: string): Promise<boolean> {
  const result = (await sql.query(
    "update revendedor_accounts set disabled_at = now() where id = $1 and is_temp = true returning id",
    [id]
  )) as { id: string }[];
  return result.length > 0;
}

export async function enableAccount(id: string): Promise<boolean> {
  const result = (await sql.query(
    "update revendedor_accounts set disabled_at = null where id = $1 and is_temp = true returning id",
    [id]
  )) as { id: string }[];
  return result.length > 0;
}

// Adds hours to whatever time is left (or to now, if already expired) —
// separate from a hard reset so extending a near-expired trial doesn't
// silently throw away a still-valid remainder.
export async function extendExpiration(id: string, extraHours: number): Promise<boolean> {
  const accounts = (await sql.query(
    "select expires_at from revendedor_accounts where id = $1 and is_temp = true",
    [id]
  )) as { expires_at: string | null }[];
  const account = accounts[0];
  if (!account) return false;

  const base = account.expires_at && new Date(account.expires_at).getTime() > Date.now()
    ? new Date(account.expires_at).getTime()
    : Date.now();
  const newExpiresAt = new Date(base + extraHours * 60 * 60 * 1000);

  const result = (await sql.query(
    "update revendedor_accounts set expires_at = $1 where id = $2 returning id",
    [newExpiresAt.toISOString(), id]
  )) as { id: string }[];
  return result.length > 0;
}

export async function changePassword(accountId: string, newPassword: string): Promise<boolean> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const result = (await sql.query(
    "update revendedor_accounts set password_hash = $1, must_change_password = false where id = $2 returning id",
    [passwordHash, accountId]
  )) as { id: string }[];
  return result.length > 0;
}

export async function markWelcomeShown(accountId: string): Promise<boolean> {
  const result = (await sql.query(
    "update revendedor_accounts set welcome_shown = true where id = $1 returning id",
    [accountId]
  )) as { id: string }[];
  return result.length > 0;
}

export async function markTutorialPromptShown(accountId: string): Promise<boolean> {
  const result = (await sql.query(
    "update revendedor_accounts set tutorial_prompt_shown = true where id = $1 returning id",
    [accountId]
  )) as { id: string }[];
  return result.length > 0;
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
