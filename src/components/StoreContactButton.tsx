"use client";

import { useState } from "react";
import { buildWhatsAppLink, buildStoreInquiryMessage } from "@/lib/whatsapp";
import { Store } from "@/lib/types";

interface StoreContactButtonProps {
  store: Store;
  productName: string;
  price: number;
  dataTutorial?: string;
}

function ContactLink({
  link,
  confirmed,
  dataTutorial,
}: {
  link: string;
  confirmed: boolean;
  dataTutorial?: string;
}) {
  return (
    <a
      data-tutorial={dataTutorial}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex flex-col items-start gap-0.5"
    >
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-ml-green">
        💬 Falar com a loja no WhatsApp
      </span>
      {!confirmed && (
        <span className="text-[10px] text-gray-400">
          telefone comercial registrado, não confirmado como WhatsApp
        </span>
      )}
    </a>
  );
}

export function StoreContactButton({
  store,
  productName,
  price,
  dataTutorial,
}: StoreContactButtonProps) {
  const message = buildStoreInquiryMessage(productName, price);
  const directLink = store.phone ? buildWhatsAppLink(store.phone, message) : null;

  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [found, setFound] = useState<{ link: string; confirmed: boolean } | null>(null);

  if (directLink) {
    return <ContactLink link={directLink} confirmed={false} dataTutorial={dataTutorial} />;
  }

  if (found) {
    return <ContactLink link={found.link} confirmed={found.confirmed} dataTutorial={dataTutorial} />;
  }

  if (notFound) {
    return (
      <p className="mt-2 text-xs text-gray-400">
        Não encontramos um contato para esta loja.
      </p>
    );
  }

  async function handleBuscar() {
    setSearching(true);
    try {
      const res = await fetch("/api/loja-contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: store.id,
          storeName: store.name,
          lat: store.coordinates.lat,
          lng: store.coordinates.lng,
        }),
      });
      const data = await res.json();
      if (data.ok && data.phone) {
        const link = buildWhatsAppLink(data.phone, message);
        if (link) {
          setFound({ link, confirmed: Boolean(data.confirmed) });
          return;
        }
      }
      setNotFound(true);
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  }

  return (
    <button
      onClick={handleBuscar}
      disabled={searching}
      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ml-blue disabled:opacity-50"
    >
      {searching ? "Buscando contato..." : "🔎 Buscar WhatsApp da loja"}
    </button>
  );
}
