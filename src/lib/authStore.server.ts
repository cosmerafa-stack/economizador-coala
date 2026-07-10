import "server-only";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "auth-db.json");
const SESSION_ACTIVE_WINDOW_MS = 15 * 60 * 1000; // a device counts as "connected" if it pinged in the last 15 min

interface Account {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string;
  senhaHash: string;
  approved: boolean;
  maxDevices: number;
  createdAt: string;
}

interface Session {
  token: string;
  userId: string;
  deviceId: string;
  loginAt: string;
  lastSeenAt: string;
}

interface Db {
  accounts: Account[];
  sessions: Session[];
}

function loadDb(): Db {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { accounts: [], sessions: [] };
  }
}

function saveDb(db: Db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function isSessionActive(session: Session): boolean {
  return Date.now() - new Date(session.lastSeenAt).getTime() < SESSION_ACTIVE_WINDOW_MS;
}

function activeDeviceIds(db: Db, userId: string, excludeDeviceId?: string): string[] {
  const ids = new Set<string>();
  for (const s of db.sessions) {
    if (s.userId !== userId) continue;
    if (excludeDeviceId && s.deviceId === excludeDeviceId) continue;
    if (isSessionActive(s)) ids.add(s.deviceId);
  }
  return [...ids];
}

function toPublic(db: Db, account: Account) {
  return {
    id: account.id,
    nome: account.nome,
    sobrenome: account.sobrenome,
    telefone: account.telefone,
    email: account.email,
    approved: account.approved,
    maxDevices: account.maxDevices,
    activeDevices: activeDeviceIds(db, account.id).length,
    createdAt: account.createdAt,
  };
}

export async function registerAccount(input: {
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string;
  senha: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = loadDb();
  const emailNormalized = input.email.trim().toLowerCase();

  if (db.accounts.some((a) => a.email.toLowerCase() === emailNormalized)) {
    return { ok: false, message: "Já existe um cadastro com este e-mail." };
  }

  const senhaHash = await bcrypt.hash(input.senha, 10);

  db.accounts.push({
    id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nome: input.nome.trim(),
    sobrenome: input.sobrenome.trim(),
    telefone: input.telefone.trim(),
    email: emailNormalized,
    senhaHash,
    approved: false,
    maxDevices: 1,
    createdAt: new Date().toISOString(),
  });

  saveDb(db);
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
  const db = loadDb();
  const emailNormalized = input.email.trim().toLowerCase();
  const account = db.accounts.find((a) => a.email === emailNormalized);

  if (!account) {
    return { ok: false, message: "E-mail ou senha incorretos." };
  }

  const match = await bcrypt.compare(input.senha, account.senhaHash);
  if (!match) {
    return { ok: false, message: "E-mail ou senha incorretos." };
  }

  if (!account.approved) {
    return {
      ok: false,
      message: "Seu cadastro ainda está em análise. Aguarde a aprovação.",
    };
  }

  const others = activeDeviceIds(db, account.id, input.deviceId);
  if (others.length >= account.maxDevices) {
    return {
      ok: false,
      message: `Limite de ${account.maxDevices} dispositivo(s) simultâneo(s) atingido para esta conta.`,
    };
  }

  // Clear any stale session for this exact device, then open a fresh one.
  db.sessions = db.sessions.filter((s) => s.deviceId !== input.deviceId);
  const token = `tok-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();
  db.sessions.push({
    token,
    userId: account.id,
    deviceId: input.deviceId,
    loginAt: now,
    lastSeenAt: now,
  });
  saveDb(db);

  return { ok: true, token, nome: account.nome };
}

export function heartbeat(token: string): boolean {
  const db = loadDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return false;
  session.lastSeenAt = new Date().toISOString();
  saveDb(db);
  return true;
}

export function logout(token: string): void {
  const db = loadDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveDb(db);
}

export function listAccounts(): ReturnType<typeof toPublic>[] {
  const db = loadDb();
  return db.accounts
    .map((a) => toPublic(db, a))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function approveAccount(id: string): boolean {
  const db = loadDb();
  const account = db.accounts.find((a) => a.id === id);
  if (!account) return false;
  account.approved = true;
  saveDb(db);
  return true;
}

export function setMaxDevices(id: string, maxDevices: number): boolean {
  const db = loadDb();
  const account = db.accounts.find((a) => a.id === id);
  if (!account) return false;
  account.maxDevices = Math.max(1, Math.floor(maxDevices));
  saveDb(db);
  return true;
}

export function removeAccount(id: string): boolean {
  const db = loadDb();
  const before = db.accounts.length;
  db.accounts = db.accounts.filter((a) => a.id !== id);
  db.sessions = db.sessions.filter((s) => s.userId !== id);
  saveDb(db);
  return db.accounts.length < before;
}
