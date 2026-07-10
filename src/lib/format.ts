export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDistance(km: number): string {
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} Km`;
}

export function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `há ${hours} hora(s), ${minutes} minuto(s) e ${seconds} segundo(s)`;
  }
  if (minutes > 0) {
    return `há ${minutes} minuto(s) e ${seconds} segundo(s)`;
  }
  return `há ${seconds} segundo(s)`;
}
