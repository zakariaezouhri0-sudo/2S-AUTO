import React, { useRef, useState, useEffect } from "react";
import { Camera, X, RefreshCw, Check } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  multiple?: boolean;
}

export function CameraCapture({ onCapture, onClose, multiple = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(base64);
      }
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      setCount(prev => prev + 1);
      if (multiple) {
        setCapturedImage(null);
      } else {
        onClose();
      }
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest">
          Photos: {count}
        </div>
      </div>

      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="relative w-full max-w-lg aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <button
                onClick={takePhoto}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-all active:scale-90"
              >
                <div className="w-12 h-12 rounded-full bg-white" />
              </button>
            </div>
          </>
        ) : (
          <>
            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
              <button
                onClick={retake}
                className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                title="Reprendre"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
              <button
                onClick={handleConfirm}
                className="w-14 h-14 rounded-full bg-garage-accent hover:bg-black flex items-center justify-center text-white transition-all shadow-lg"
                title="Valider cette photo"
              >
                <Check className="w-6 h-6" />
              </button>
            </div>
          </>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-zinc-900">
            <div className="space-y-4">
              <p className="text-white text-sm font-medium">{error}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-widest"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      
      {multiple && count > 0 && !capturedImage && (
        <button
          onClick={onClose}
          className="mt-8 px-8 py-3 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl hover:bg-zinc-200 transition-all active:scale-95"
        >
          Terminer la capture ({count})
        </button>
      )}

      {!capturedImage && !multiple && (
        <div className="mt-8 text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">
          Capture de Document 2S AUTO
        </div>
      )}
    </div>
  );
}
