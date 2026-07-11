import { useEffect, useRef, useState } from "preact/hooks";
import {
  CheckCircleIcon,
  MessageSquareIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "./icons";

declare global {
  interface Window {
    InsightStreamConfig?: {
      apiKey?: string;
      apiUrl?: string;
      color?: string;
      shape?: "circle" | "square" | "rounded";
      position?: "bottom-right" | "bottom-left";
    };
  }
}

// Panel enter/exit is driven by two states instead of framer-motion's
// AnimatePresence: `panelMounted` keeps the node in the DOM long enough for
// the exit CSS transition (PANEL_TRANSITION_MS) to finish before removal.
const PANEL_TRANSITION_MS = 250;

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelShown, setPanelShown] = useState(false);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const config = window.InsightStreamConfig || {};
  const primaryColor = config.color || "#6366f1"; // Indigo-500
  const shape = config.shape || "circle";
  const position = config.position || "bottom-right";

  useEffect(() => {
    if (isOpen) {
      setPanelMounted(true);
      const raf = requestAnimationFrame(() => setPanelShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setPanelShown(false);
    const timeout = setTimeout(() => setPanelMounted(false), PANEL_TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  // Depends on panelMounted, not isOpen: the textarea only exists in the DOM
  // once panelMounted flips true (a render after isOpen changes), so an
  // isOpen-keyed effect would fire before textareaRef is attached.
  useEffect(() => {
    if (panelMounted && status !== "success") {
      textareaRef.current?.focus();
    }
  }, [panelMounted, status]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!content.trim() || !config.apiKey) return;

    setStatus("loading");
    try {
      const apiUrl =
        window.InsightStreamConfig?.apiUrl ||
        import.meta.env.VITE_API_URL ||
        "https://api-production-05c4.up.railway.app";
      const res = await fetch(`${apiUrl}/feedback/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: config.apiKey,
          content,
          source: "Widget",
        }),
      });
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      setStatus("success");
      setContent("");
      setTimeout(() => {
        setStatus("idle");
        setIsOpen(false);
      }, 3000);
    } catch (err) {
      console.error("InsightStream Widget Error:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const buttonClass = `
    flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group relative
    ${shape === "circle" ? "rounded-full w-14 h-14" : shape === "square" ? "rounded-none w-14 h-14" : "rounded-2xl px-5 py-3"}
  `;

  return (
    <div
      className={`fixed bottom-12 ${position === "bottom-right" ? "right-12" : "left-12"} font-sans z-999999 flex flex-col items-end`}
    >
      {panelMounted && (
        <div
          className={`mb-4 w-85 bg-neutral-900/95 backdrop-blur-2xl rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden border border-white/10 ring-1 ring-white/5 transition-all duration-250 ${
            panelShown
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-5 scale-95"
          }`}
        >
          {/* Header */}
          <div className="p-6 pb-2 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <SparklesIcon size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base tracking-tight leading-none mb-1">
                  InsightStream AI
                </h3>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                  Feedback Intelligence
                </p>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 pt-4 relative z-10">
            {status === "success" ? (
              <div
                data-testid="widget-success"
                className="py-12 flex flex-col items-center justify-center text-center gap-5"
              >
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 animate-success-pop">
                  <CheckCircleIcon size={40} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xl">
                    Feedback Received!
                  </h4>
                  <p className="text-sm text-neutral-400 mt-2 max-w-[220px] mx-auto leading-relaxed">
                    Our AI is now analyzing your input to improve the
                    platform.
                  </p>
                </div>
              </div>
            ) : (
              <form
                data-testid="widget-form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <div className="relative group">
                  <textarea
                    ref={textareaRef}
                    data-testid="widget-textarea"
                    placeholder="How can we make this better for you?"
                    value={content}
                    onInput={(e) => setContent(e.currentTarget.value)}
                    className="w-full h-40 p-6 text-sm text-neutral-200 bg-neutral-950/60 border border-neutral-800 rounded-2xl focus:outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none placeholder:text-neutral-600 leading-relaxed"
                    style={{
                      borderColor: status === "error" ? "#ef4444" : undefined,
                    }}
                  />
                  <div className="absolute bottom-4 right-4 opacity-10 pointer-events-none group-focus-within:opacity-30 transition-opacity">
                    <MessageSquareIcon size={16} className="text-white" />
                  </div>
                </div>

                <button
                  data-testid="widget-submit"
                  disabled={status === "loading" || !content.trim()}
                  className="w-full py-4 rounded-2xl text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-[0_15px_30px_-5px_rgba(99,102,241,0.5)] hover:shadow-[0_20px_40px_-5px_rgba(99,102,241,0.6)] active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, #4f46e5)`,
                  }}
                >
                  {status === "loading" ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <SendIcon size={18} />
                      Submit via AI
                    </>
                  )}
                </button>
                {status === "error" && (
                  <p className="text-[11px] text-red-400 text-center font-semibold bg-red-400/5 py-3 rounded-2xl border border-red-400/10 animate-fade-in">
                    Sync connection lost. Try again?
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white/3 text-center border-t border-white/5 flex items-center justify-center gap-2 opacity-60">
            <SparklesIcon size={12} className="text-indigo-400" />
            <p className="text-[9px] text-neutral-400 uppercase tracking-[0.25em] font-black">
              InsightStream AI Intelligence
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="widget-trigger"
        className={buttonClass}
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, #4f46e5)`,
        }}
        aria-label="Toggle Feedback Widget"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300" />
        {isOpen ? (
          <XIcon size={28} className="text-white" />
        ) : (
          <MessageSquareIcon size={28} className="text-white" />
        )}
      </button>
    </div>
  );
}

export default App;
