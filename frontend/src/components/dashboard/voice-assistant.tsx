"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { createBlob, decode, decodeAudioData } from "@/lib/audioUtils";
import toast from "react-hot-toast";

function getWsUrl(): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws/browser`;
}

export function VoiceAssistant() {
  const [isActive, setIsActive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [subtitleText, setSubtitleText] = useState("");

  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const activeRef = useRef(false);

  // Init audio contexts once
  useEffect(() => {
    const init = async () => {
      try {
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        const outputCtx = new AudioContext({ sampleRate: 24000 });
        inputAudioCtxRef.current = inputCtx;
        outputAudioCtxRef.current = outputCtx;

        const outputNode = outputCtx.createGain();
        outputNode.connect(outputCtx.destination);
        outputNodeRef.current = outputNode;

        if (!inputCtx.audioWorklet) {
          console.warn("AudioWorklet not supported");
          return;
        }

        await inputCtx.audioWorklet.addModule("/audio-processor.js");
        setIsReady(true);
      } catch (err) {
        console.error("Audio init failed:", err);
      }
    };
    init();
    return () => cleanup();
  }, []);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current.port.postMessage("STOP");
      workletNodeRef.current = null;
    }
    sourcesRef.current.forEach((s) => {
      try { s.stop(); } catch { /* */ }
    });
    sourcesRef.current.clear();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const stopSession = useCallback(() => {
    cleanup();
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setSubtitleText("");
  }, [cleanup]);

  const startSession = useCallback(async () => {
    setIsConnecting(true);
    setSubtitleText("");

    try {
      const inputCtx = inputAudioCtxRef.current!;
      const outputCtx = outputAudioCtxRef.current!;
      await inputCtx.resume();
      await outputCtx.resume();

      // Mic with echo cancellation
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = micStream;

      // WebSocket to EVA backend
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "config", text: "", data: "" }));
      };

      ws.onmessage = async (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case "status":
              if (msg.text === "ready") {
                activeRef.current = true;
                setIsActive(true);
                setIsConnecting(false);
                toast.success("EVA conectada. Pode falar.");

                // Start audio capture
                const source = inputCtx.createMediaStreamSource(micStream);
                const workletNode = new AudioWorkletNode(inputCtx, "audio-processor");
                workletNode.port.onmessage = (e: MessageEvent) => {
                  if (!activeRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
                  try {
                    const blob = createBlob(e.data);
                    wsRef.current.send(JSON.stringify({ type: "audio", data: blob.data }));
                  } catch { /* */ }
                };
                source.connect(workletNode);
                workletNode.connect(inputCtx.destination);
                workletNodeRef.current = workletNode;
              } else if (msg.text === "interrupted") {
                setIsSpeaking(false);
                setSubtitleText("");
                sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* */ } });
                sourcesRef.current.clear();
                if (outputAudioCtxRef.current) {
                  nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
                }
              } else if (msg.text === "turn_complete") {
                setTimeout(() => {
                  setIsSpeaking(false);
                  setSubtitleText("");
                }, 500);
              } else if (msg.text === "reconnecting") {
                toast("EVA reconectando...", { icon: "🔄" });
              } else if (msg.text?.startsWith("error")) {
                toast.error("Erro na sessao EVA");
                stopSession();
              }
              break;

            case "text":
              if (msg.text) {
                if (msg.data === "user") {
                  // User transcription — skip or show subtle
                } else {
                  setSubtitleText(msg.text);
                }
              }
              break;

            case "audio":
              if (msg.data) {
                setIsSpeaking(true);
                const ctx = outputAudioCtxRef.current;
                if (!ctx) return;
                if (ctx.state === "suspended") await ctx.resume();
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                try {
                  const audioBuffer = await decodeAudioData(decode(msg.data), ctx, 24000, 1);
                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputNodeRef.current!);
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
                  source.onended = () => sourcesRef.current.delete(source);
                } catch { /* */ }
              }
              break;

            case "tool_event":
              toast.success(`Ferramenta: ${msg.tool}`);
              break;
          }
        } catch { /* */ }
      };

      ws.onclose = () => {
        if (activeRef.current) {
          stopSession();
          toast.error("Conexao com EVA perdida.");
        }
      };

      ws.onerror = () => {
        setIsConnecting(false);
        toast.error("Erro ao conectar com EVA.");
        stopSession();
      };
    } catch (err) {
      console.error("Session start failed:", err);
      setIsConnecting(false);
      toast.error("Erro ao acessar microfone.");
      stopSession();
    }
  }, [stopSession]);

  return (
    <>
      {/* Subtitle overlay */}
      {subtitleText && (
        <div className="fixed bottom-28 right-8 z-[9998] max-w-sm animate-slide-up">
          <div className="rounded-xl border border-[hsl(215,50%,24%)]/20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg px-4 py-3 shadow-lg">
            <div className="flex items-start gap-2">
              <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-[#c9952b]" />
              <p className="text-sm leading-relaxed text-[hsl(215,28%,17%)] dark:text-gray-200">
                {subtitleText}
                <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#c9952b]" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          {/* Pulse ring when speaking */}
          {isSpeaking && (
            <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-[#c9952b]/30" />
          )}

          <button
            disabled={!isReady || isConnecting}
            onClick={isActive ? stopSession : startSession}
            className={`relative h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 ease-out shadow-lg
              ${isActive
                ? "bg-red-600 shadow-red-600/40 hover:bg-red-700"
                : "bg-gradient-to-br from-[#1e3a5f] to-[#2d5389] hover:scale-110 hover:shadow-xl hover:shadow-[#1e3a5f]/50"
              }
              ${(!isReady || isConnecting) ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer"}
            `}
            title={isActive ? "Parar conversa" : "Falar com EVA"}
          >
            {isConnecting ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : isActive ? (
              <MicOff className="h-7 w-7 text-white" />
            ) : (
              <Mic className="h-7 w-7 text-white" />
            )}

            {/* Gold accent ring */}
            {!isActive && !isConnecting && isReady && (
              <span className="absolute inset-0 rounded-full ring-2 ring-[#c9952b]/50 ring-offset-2 ring-offset-transparent" />
            )}
          </button>
        </div>

        {/* Label */}
        <span className="mt-2 text-[10px] font-semibold tracking-wide text-[hsl(215,28%,17%)] dark:text-gray-400 uppercase">
          {isConnecting ? "Conectando..." : isActive ? (isSpeaking ? "EVA falando" : "Ouvindo...") : "EVA"}
        </span>
      </div>
    </>
  );
}
