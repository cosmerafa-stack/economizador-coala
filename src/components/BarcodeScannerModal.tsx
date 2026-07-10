"use client";

import { useEffect, useRef } from "react";

const SCANNER_ELEMENT_ID = "barcode-scanner-region";

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({
  onDetected,
  onClose,
}: BarcodeScannerModalProps) {
  const scannerRef = useRef<import("html5-qrcode").Html5QrcodeScanner | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;

      const scanner = new Html5QrcodeScanner(
        SCANNER_ELEMENT_ID,
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false
      );

      scanner.render(
        (decodedText) => {
          onDetected(decodedText);
          scanner.clear().catch(() => {});
        },
        () => {
          // ignore per-frame scan misses
        }
      );

      scannerRef.current = scanner;
    });

    return () => {
      cancelled = true;
      scannerRef.current?.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div id={SCANNER_ELEMENT_ID} className="overflow-hidden rounded-lg" />
        <p className="mt-3 text-center text-xs text-gray-400">
          Sem câmera disponível? Digite o código manualmente.
        </p>
      </div>
    </div>
  );
}
