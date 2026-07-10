"use client";

import { useEffect, useRef, useState } from "react";

const SCANNER_ELEMENT_ID = "barcode-scanner-region";

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({
  onDetected,
  onClose,
}: BarcodeScannerModalProps) {
  const instanceRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;

      const instance = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        verbose: false,
      });
      instanceRef.current = instance;

      instance
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            onDetected(decodedText);
            instance.stop().catch(() => {});
          },
          () => {
            // ignore per-frame scan misses
          }
        )
        .catch(() => {
          if (!cancelled) setCameraError(true);
        });
    });

    return () => {
      cancelled = true;
      const instance = instanceRef.current;
      if (instance?.isScanning) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitManualCode() {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    onDetected(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-[480px] rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            Aponte para o código de barras
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-2xl leading-none text-gray-400"
          >
            ×
          </button>
        </div>

        {!cameraError && (
          <div
            id={SCANNER_ELEMENT_ID}
            className="overflow-hidden rounded-lg bg-gray-900"
          />
        )}

        {cameraError && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
            Não foi possível acessar a câmera. Digite o código abaixo.
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManualCode()}
            placeholder="Digitar código de barras"
            inputMode="numeric"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
          />
          <button
            onClick={submitManualCode}
            className="rounded-xl bg-ml-blue px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
