"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type: "standard";
              theme: "outline";
              size: "large";
              text: "continue_with";
              shape: "pill";
              width: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const SCRIPT_ID = "google-identity-services";

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve()));
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
}

export function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;

    loadGoogleScript().then(() => {
      if (cancelled || !window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
        auto_select: false,
        use_fedcm_for_prompt: true,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 320,
      });

      // Triggers the "Continuar como <Nome>" One Tap prompt when the
      // browser already has an active Google session from a previous
      // sign-in — this is Google's own UI, not something we render.
      window.google.accounts.id.prompt();
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCredential is expected to be stable enough for the lifetime of this button
  }, []);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return <div ref={buttonRef} className="flex justify-center" />;
}
