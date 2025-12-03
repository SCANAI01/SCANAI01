"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DEMO_CHAT_LINES = [
  {
    role: "user" as const,
    label: "Trader",
    text: "Scan this BNB token for rug risk: 0x1234…",
  },
  {
    role: "assistant" as const,
    label: "SCANAI",
    text: "Risk score: 28 / 100 (high). Unlocked LP, owner can blacklist, top holders own 65%.",
  },
  {
    role: "user" as const,
    label: "Trader",
    text: "Ok, show me momentum + depth for 0xabcd…",
  },
];

export default function ChatTeaserSection() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const current = DEMO_CHAT_LINES[activeIndex];
    if (!current) return;

    if (typed.length < current.text.length) {
      const id = setTimeout(() => {
        setTyped(current.text.slice(0, typed.length + 1));
      }, 26);
      return () => clearTimeout(id);
    }

    if (activeIndex < DEMO_CHAT_LINES.length - 1) {
      const id = setTimeout(() => {
        setActiveIndex((prev) => prev + 1);
        setTyped("");
      }, 900);
      return () => clearTimeout(id);
    }
  }, [activeIndex, typed]);

  const goToChat = () => router.push("/chat");

  const current = DEMO_CHAT_LINES[activeIndex];

  return (
    <section
      id="chat"
      className="relative bg-black border-t border-white/10 py-14 lg:py-18 overflow-hidden"
    >
      {/* soft glow + grid */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-x-0 top-0 h-[340px] opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(242,185,0,0.22), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.05]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="chat-dots"
                x="0"
                y="0"
                width="28"
                height="28"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.3)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#chat-dots)" />
          </svg>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 lg:px-8">
        {/* header line */}
        <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-white/45">
              Chat · AI risk copilot
            </p>
            <h2 className="w-full max-w-none bg-[radial-gradient(89.47%_51.04%_at_44.27%_50%,_#E2E3E9_0%,_#D4D6DE_52.73%,_#3D3F4C_100%)] bg-clip-text text-left font-title font-medium leading-[0.9] tracking-[-0.04em] text-transparent text-[clamp(36px,7vw,72px)]">
              Chat with{" "}
              <span className="bg-[linear-gradient(180deg,#F2B900_0%,#F9E400_45%,#C8871E_100%)] bg-clip-text text-transparent">
                SCANAI
              </span>{" "}
              about any BNB token.
            </h2>
            <p className="mt-4 max-w-[560px] text-[15px] leading-snug tracking-tight text-white/65 sm:text-[16px]">
              Test questions here. Jump into the full chat and keep the
              conversation going.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
            <span className="rounded-full border border-white/18 bg-white/[0.04] px-3 py-1">
              No wallet · No API key
            </span>
            <span className="rounded-full border border-white/18 bg-white/[0.04] px-3 py-1">
              Read-only · BNB mainnet
            </span>
          </div>
        </div>

        {/* chat shell with #111113 background */}
        <div className="rounded-[36px] bg-[#111113] shadow-[0_40px_140px_rgba(0,0,0,0.9)] px-4 py-5 sm:px-6 sm:py-6">
          {/* chat card */}
          <div
            onClick={goToChat}
            className="group cursor-pointer rounded-[30px] border border-white/[0.16] bg-[radial-gradient(circle_at_0%_0%,rgba(242,185,0,0.2),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(242,185,0,0.18),transparent_55%),#020202] p-[1.5px] shadow-[0_26px_80px_rgba(0,0,0,0.9)]"
          >
            <div className="flex h-full flex-col justify-between rounded-[28px] bg-black/90 px-5 py-5 sm:px-7 sm:py-6">
              {/* messages */}
              <div className="space-y-4 text-left">
                {DEMO_CHAT_LINES.slice(0, activeIndex).map((msg, idx) => (
                  <div key={idx} className="flex gap-3 justify-start">
                    <div
                      className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                        msg.role === "assistant"
                          ? "bg-[rgba(242,185,0,0.9)]"
                          : "bg-white/70"
                      }`}
                    />
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
                        {msg.label}
                      </p>
                      <p
                        className={`text-[13px] leading-relaxed ${
                          msg.role === "assistant"
                            ? "text-white"
                            : "text-white/80"
                        }`}
                      >
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}

                {current && (
                  <div className="flex gap-3 justify-start">
                    <div
                      className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                        current.role === "assistant"
                          ? "bg-[rgba(242,185,0,0.9)]"
                          : "bg-white/70"
                      }`}
                    />
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
                        {current.label}
                      </p>
                      <p
                        className={`text-[13px] leading-relaxed ${
                          current.role === "assistant"
                            ? "text-white"
                            : "text-white/80"
                        }`}
                      >
                        {typed}
                        <span className="ml-[2px] inline-block h-[14px] w-[8px] translate-y-[1px] bg-white/80 align-middle animate-pulse group-hover:bg-white" />
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* fake input bar + your gradient button */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex flex-1 items-center gap-3 rounded-full border border-white/15 bg-white/[0.02] px-4 py-2.5 backdrop-blur-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]">
                    <span className="text-[11px] font-semibold text-white/80">
                      →
                    </span>
                  </div>
                  <p className="flex-1 text-[12px] text-white/55">
                    Type a question about any BNB token…
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToChat();
                  }}
                  className="group relative inline-flex h-10 items-center justify-center rounded-full px-6 text-[14px] font-semibold tracking-tight leading-none outline-none shadow-[0px_2px_2px_0px_rgba(0,0,0,0.74)] transition-colors duration-300 focus:outline-1 focus:outline-offset-4 focus:outline-white"
                >
                  <span className="absolute -inset-px bottom-[-1.5px] rounded-full bg-[linear-gradient(180deg,#fcc171_0%,#C17C56_50%,#362821_100%)]" />
                  <span className="absolute -top-[5px] bottom-0.5 left-1/2 w-[91%] -translate-x-1/2 bg-btn-glowing mix-blend-screen blur-[1px] transition-transform duration-300 ease-in-out group-hover:translate-y-[-2px]" />
                  <span className="absolute inset-0 rounded-full bg-black" />
                  <span className="absolute inset-0 rounded-full bg-btn-glowing-inset opacity-100 transition-opacity duration-300 ease-in-out group-hover:opacity-0" />
                  <span className="absolute inset-0 rounded-full bg-btn-glowing-inset-hover opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
                  <span className="relative z-20 bg-[linear-gradient(180deg,#FFF_33.33%,#E4D0B1_116.67%)] bg-clip-text text-transparent">
                    Open chat
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[10px] text-white/40">
          SCANAI chat is informational only and does not provide investment
          advice.
        </p>
      </div>
    </section>
  );
}
