"use client";

import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

const MAX_WIDTH = 1000;
const JPEG_QUALITY = 0.7;

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Não foi possível acessar a câmera. Verifique as permissões do navegador."
          );
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    onCapture(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-white"
        >
          ×
        </button>
        <span className="text-sm font-medium text-white/80">
          Fotografar nota/recibo
        </span>
        <span className="w-9" />
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <p className="px-8 text-center text-sm text-white/80">{error}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-full max-w-full"
          />
        )}
      </div>

      <div className="flex items-center justify-center px-4 py-6">
        <button
          onClick={capture}
          disabled={!!error}
          aria-label="Tirar foto"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 transition-transform active:scale-90 disabled:opacity-40"
        >
          <span className="h-12 w-12 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
