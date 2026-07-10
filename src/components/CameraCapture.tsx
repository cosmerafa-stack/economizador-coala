"use client";

import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.92;

function applyContinuousFocus(track: MediaStreamTrack) {
  const capabilities = track.getCapabilities?.() as
    | (MediaTrackCapabilities & { focusMode?: string[] })
    | undefined;
  if (capabilities?.focusMode?.includes("continuous")) {
    track
      .applyConstraints({
        advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
      })
      .catch(() => {});
  }
}

// Best-effort manual refocus: most Android camera implementations only
// re-evaluate focus on a mode transition, so briefly dropping out of
// continuous mode and back into it nudges the lens to refocus.
async function nudgeRefocus(track: MediaStreamTrack) {
  const capabilities = track.getCapabilities?.() as
    | (MediaTrackCapabilities & { focusMode?: string[] })
    | undefined;
  if (!capabilities?.focusMode) return;

  try {
    if (capabilities.focusMode.includes("single-shot")) {
      await track.applyConstraints({
        advanced: [{ focusMode: "single-shot" } as MediaTrackConstraintSet],
      });
    }
  } catch {
    // ignore — not all devices support switching modes at runtime
  } finally {
    if (capabilities.focusMode.includes("continuous")) {
      setTimeout(() => {
        track
          .applyConstraints({
            advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
          })
          .catch(() => {});
      }, 350);
    }
  }
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusing, setFocusing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: MAX_WIDTH },
          height: { ideal: MAX_WIDTH },
        },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const [track] = stream.getVideoTracks();
        trackRef.current = track ?? null;
        if (track) applyContinuousFocus(track);
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

  function handleFocus() {
    const track = trackRef.current;
    if (!track) return;
    setFocusing(true);
    nudgeRefocus(track).finally(() => {
      setTimeout(() => setFocusing(false), 500);
    });
  }

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
          <button
            onClick={handleFocus}
            aria-label="Focar"
            className="relative h-full w-full"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full max-h-full w-full max-w-full object-contain"
            />
            {focusing && (
              <span className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white/80" />
            )}
          </button>
        )}
      </div>

      {!error && (
        <p className="px-8 pb-1 text-center text-xs text-white/60">
          Toque na tela ou no botão para focar antes de tirar a foto
        </p>
      )}

      <div className="flex items-center justify-center gap-8 px-4 py-6">
        <button
          onClick={handleFocus}
          disabled={!!error}
          aria-label="Focar"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl text-white transition-transform active:scale-90 disabled:opacity-40"
        >
          🎯
        </button>
        <button
          onClick={capture}
          disabled={!!error}
          aria-label="Tirar foto"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 transition-transform active:scale-90 disabled:opacity-40"
        >
          <span className="h-12 w-12 rounded-full bg-white" />
        </button>
        <span className="w-12" />
      </div>
    </div>
  );
}
