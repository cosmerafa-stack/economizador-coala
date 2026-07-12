"use client";

import { CartItem, Nota, NotaProduto } from "./types";

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function pullCart(token: string): Promise<CartItem[]> {
  const res = await fetch("/api/revendedor/carrinho", { headers: authHeaders(token) });
  if (!res.ok) return [];
  const data = await res.json();
  return data.cart ?? [];
}

export function pushCartSnapshot(cart: CartItem[], token: string): Promise<void> {
  return fetch("/api/revendedor/carrinho", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ cart }),
  }).then(() => undefined);
}

export async function pullNotas(token: string): Promise<Nota[]> {
  const res = await fetch("/api/revendedor/notas", { headers: authHeaders(token) });
  if (!res.ok) return [];
  const data = await res.json();
  return data.notas ?? [];
}

export function pushNota(nota: Nota, token: string): Promise<void> {
  return fetch("/api/revendedor/notas", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ nota }),
  }).then(() => undefined);
}

export function deleteNotaRemote(id: string, token: string): Promise<void> {
  return fetch(`/api/revendedor/notas/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  }).then(() => undefined);
}

export function patchNotaProdutoRemote(
  notaId: string,
  index: number,
  changes: Partial<Pick<NotaProduto, "descricao" | "valorUnitario" | "valorTotal">>,
  token: string
): Promise<void> {
  return fetch(`/api/revendedor/notas/${notaId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ index, changes }),
  }).then(() => undefined);
}

export interface RemoteSettings {
  found: boolean;
  defaultProfitPercent: number | null;
  searchRadiusKm: number | null;
}

export async function pullSettings(token: string): Promise<RemoteSettings> {
  const res = await fetch("/api/revendedor/configuracoes", { headers: authHeaders(token) });
  if (!res.ok) return { found: false, defaultProfitPercent: null, searchRadiusKm: null };
  return res.json();
}

export function pushSettings(
  defaultProfitPercent: number,
  searchRadiusKm: number,
  token: string
): Promise<void> {
  return fetch("/api/revendedor/configuracoes", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ defaultProfitPercent, searchRadiusKm }),
  }).then(() => undefined);
}
