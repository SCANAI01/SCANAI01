"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { WavyBackground } from "@/src/components/ui/wavy-background";
import { EvervaultCard, Icon } from "@/src/components/ui/evervault-card";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import ChatTeaserSection from "@/components/ChatTeaserSection";

const BASE_BG = "#000000";

const PILLARS = [
  {
    id: "risk",
    title: "Risk Engine",
    subtitle: "Honeypots • Liquidity • Holders",
    statLabel: "Risk Score",
    statValue: "0 → 100",
    tagline:
      "Deterministic scoring pipeline that inspects contract permissions, liquidity and holder topology before you touch a chart. This rail is the backbone of the global risk score the AI analyst reads and explains.",
    bullets: [
      "Honeypot + transfer tax checks on live bytecode",
      "LP lock / unlock and owner privileges scoring",
      "Top holder clustering and distribution penalties",
    ],
    codeSolidity: `// Example: require a minimum safety score
uint256 score = sentinel.getRiskScore(token);
require(score >= 40, "SCANAI: score too low");`,
    codeScript: `const report = await client.risk("0x...");

if (report.score < 40) {
  console.warn("High structural risk detected");
}`,
  },
  {
    id: "momentum",
    title: "Momentum Radar",
    subtitle: "Price • Volume • Velocity",
    statLabel: "Timeframes",
    statValue: "5m → 24h",
    tagline:
      "Multi-TF momentum with volatility and acceleration signals built directly from DEX trades on BNB Chain. This rail powers the momentum score and directional bias that the AI turns into trading scenarios.",
    bullets: [
      "Weighted trend scoring across 5m / 1h / 6h / 24h",
      "Buy / sell pressure from real fills, not candles",
      "Velocity detects blow-off tops and slow drips",
    ],
    codeSolidity: `// Read momentum tier (0-3)
uint8 tier = sentinel.getMomentumTier(token);
require(tier > 0, "SCANAI: no positive momentum");`,
    codeScript: `const momentum = await client.momentum("0x...");

console.log(momentum.window["1h"].trend);   // "up", "flat", "down"
console.log(momentum.pressure.buyRatio);    // 0.0 - 1.0`,
  },
  {
    id: "market",
    title: "Market Microstructure",
    subtitle: "Impact • Depth • Stability",
    statLabel: "Simulated Sizes",
    statValue: "$100 → $10k",
    tagline:
      "Simulates realistic trade sizes on BNB DEXes to estimate slippage, depth and reflexivity before you size a position. This rail feeds the AI's commentary on execution quality, pool stress and sizing risk.",
    bullets: [
      "Slippage curves for buys and sells across sizes",
      "Volume consistency and churn classification",
      "Detects spoof-like bursts and dead-liquidity traps",
    ],
    codeSolidity: `// Get impact for a 1 BNB buy
uint256 bps = sentinel.getPriceImpact(token, 1 ether);
// revert if too thin
require(bps <= 500, "SCANAI: illiquid pool");`,
    codeScript: `const depth = await client.depth("0x...");

console.log(depth.buy["1_bnb"].impactBps);
console.log(depth.healthLabel); // "deep", "ok", "thin"`,
  },
  {
    id: "rugwatch",
    title: "Rugwatcher",
    subtitle: "Crashes • Drains • Degen",
    statLabel: "Drop Monitor",
    statValue: "-80% 24h",
    tagline:
      "Heuristics for catastrophic drops, LP drains and volume collapses to separate dead rugs from high-risk rebounds. This rail drives the AI's \"rugged / recovering / stable\" language in survival analysis.",
    bullets: [
      "Detects -80%+ collapses and LP withdrawals",
      "Flags sudden owner sell-offs and unlock events",
      "Tracks post-rug stabilization vs. flatline",
    ],
    codeSolidity: `// Simple safety gate
bool rugged = sentinel.isRugged(token);
require(!rugged, "SCANAI: rug conditions met");`,
    codeScript: `const rug = await client.rugwatch("0x...");

if (rug.flags.length) {
  rug.flags.forEach((f) => console.warn("⚠", f));
}`,
  },
];

export default function Home() {
  const [address, setAddress] = useState("");
  const [currentPillar, setCurrentPillar] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [textTransforms, setTextTransforms] = useState<Record<string, { x: number; y: number }>>({});
  const router = useRouter();
  
  // Memoize scroll handlers to prevent re-creation on every render
  const scrollToAnalyzer = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("analyzer");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToMethodology = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("methodology");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Animate text transforms for floating effect - Optimized: reduced frequency to 200ms to minimize re-renders
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;
    let isActive = true;
    
    const animate = (currentTime: number) => {
      if (!isActive) return;
      
      // Throttle to update state only every 200ms to reduce re-renders significantly
      if (currentTime - lastTime >= 200) {
        const time = currentTime * 0.001;
        setTextTransforms({
          text1: { x: Math.sin(time * 0.5) * 5, y: Math.cos(time * 0.7) * 4 },
          text2: { x: Math.cos(time * 0.6) * 4, y: Math.sin(time * 0.5) * 5 },
          text3: { x: Math.sin(time * 0.4) * 6, y: Math.cos(time * 0.6) * 5 },
          text4: { x: Math.cos(time * 0.5) * 5, y: Math.sin(time * 0.4) * 4 },
          text5: { x: Math.sin(time * 0.7) * 4, y: Math.cos(time * 0.5) * 5 },
          text6: { x: Math.cos(time * 0.6) * 5, y: Math.sin(time * 0.7) * 4 },
        });
        lastTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    // Only start animation if page is visible
    if (typeof window !== "undefined" && document.visibilityState === "visible") {
      animationFrameId = requestAnimationFrame(animate);
    }

    // Pause animation when page is hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        isActive = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      } else {
        isActive = true;
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleAnalyze = React.useCallback(() => {
    if (address.trim()) {
      router.push(`/analyze/${address.trim()}`);
    }
  }, [address, router]);

  const handlePrev = React.useCallback(() =>
    setCurrentPillar((prev) => (prev === 0 ? PILLARS.length - 1 : prev - 1)), []);

  const handleNext = React.useCallback(() =>
    setCurrentPillar((prev) => (prev === PILLARS.length - 1 ? 0 : prev + 1)), []);

  const pillar = PILLARS[currentPillar];

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{ backgroundColor: BASE_BG }}
    >
      {/* subtle dot texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dot-grid"
              x="0"
              y="0"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.18)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          {/* logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
              <img src="/logo.png" className="w-32 object-cover" />
            </Link>
          </div>

          {/* center nav */}
          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <a href="#analyzer" className="hover:text-white transition-colors">
              Product
            </a>
            <a href="#stack" className="hover:text-white transition-colors">
              Stack
            </a>
            <a href="#methodology" className="hover:text-white transition-colors">
              Methodology
            </a>
            <a href="#about" className="hover:text-white transition-colors">
              About
            </a>
          </nav>

          {/* right CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="hidden rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-medium text-white/85 shadow-sm hover:bg-white/15 md:inline-block transition-colors"
            >
              Chat
            </Link>
            <a
              href="https://github.com/SCANAI01"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-medium text-white/85 shadow-sm hover:bg-white/15 md:inline-block"
            >
              View GitHub
            </a>
            <a
              href="https://x.com/Scanai01"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-black shadow-sm hover:bg-[#f5f5f5] md:inline-block"
            >
              Follow on X
            </a>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden relative z-50 p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-200 active:scale-95"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white transition-transform duration-300 rotate-90" />
              ) : (
                <Menu className="w-6 h-6 text-white transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer - Slide from right */}
      <div
        className={`md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-sm z-50 bg-gradient-to-b from-black via-black to-black/95 backdrop-blur-2xl border-l border-white/[0.1] shadow-[-8px_0_32px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="w-24 object-cover" />
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>

        {/* Menu Content */}
        <nav className="flex flex-col px-4 py-6 h-[calc(100vh-81px)] overflow-y-auto">
          {/* Navigation Links */}
          <div className="space-y-1 mb-6">
            <a
              href="#analyzer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent active:bg-white/15 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B900] opacity-60" />
              Product
            </a>
            <a
              href="#stack"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent active:bg-white/15 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B900] opacity-60" />
              Stack
            </a>
            <a
              href="#methodology"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent active:bg-white/15 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B900] opacity-60" />
              Methodology
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent active:bg-white/15 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B900] opacity-60" />
              About
            </a>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.08] my-4" />

          {/* Action Buttons */}
          <div className="space-y-3 mt-2">
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="group relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-white/12 to-white/8 hover:from-white/18 hover:to-white/12 active:from-white/22 active:to-white/15 transition-all duration-200 shadow-[0_4px_12px_rgba(242,185,0,0.15)]"
            >
              <span>Chat</span>
              <svg className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            
            <a
              href="https://github.com/SCANAI01"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium text-white/85 bg-white/5 hover:bg-white/10 hover:text-white active:bg-white/15 transition-all duration-200 border border-white/10"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>View GitHub</span>
            </a>
            
            <a
              href="https://x.com/Scanai01"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-[#f5f5f5] active:bg-[#e5e5e5] transition-all duration-200 shadow-[0_4px_12px_rgba(255,255,255,0.2)]"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Follow on X</span>
            </a>
          </div>

          {/* Footer note */}
          <div className="mt-auto pt-6 pb-4">
            <p className="text-[10px] text-white/40 text-center px-4">
              © 2025 SCANAI
            </p>
          </div>
        </nav>
      </div>
      <main className="relative z-10">
        {/* HERO + ANALYZER WRAPPER */}
        <section className="relative overflow-visible pb-0 pt-8 sm:pt-6 lg:pt-20">
          {/* WAVY BACKGROUND + DARK FADE */}
          <div className="pointer-events-none absolute inset-x-0 -top-32 z-0 h-auto">
          <WavyBackground
              backgroundFill="#000000"
              colors={["#F3BA2F", "#F0B90B", "#C8871E", "#f97316"]}
              waveWidth={60}
              blur={11}
              speed="slow"
              waveOpacity={0.25}
              containerClassName="absolute inset-0 -z-10 pointer-events-none flex items-center justify-center"
              className="h-full w-full"
            />
            {/* darken bottom so analyzer sits on black */}
            <div
              className="absolute inset-x-0 bottom-0 h-[800px]"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.85) 65%, #000000 100%)",
              }}
            />
          </div>

          {/* HERO CONTENT */}
          <section
            id="hero"
            className="relative mx-auto w-full max-w-6xl -mt-10 px-6 pt-0 sm:-mt-14 lg:-mt-18 lg:px-8"
          >
            <div className="relative py-6 lg:py-10">
              {/* ORB / VIDEO – big, on the right, behind text */}
              <div
                className="
                  pointer-events-none
                  absolute inset-x-0 -top-16 flex justify-center z-0
                  sm:-top-20
                  lg:inset-x-auto lg:right-[-160px] lg:top-[-140px]
                "
              >
                <div className="relative h-[320px] w-[240px] sm:h-[420px] sm:w-[300px] lg:h-[820px] lg:w-[820px]">
                  {/* soft glow behind orb */}
                  <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.7),transparent_65%)] opacity-80 blur-3xl" />
                  <video
                    src="/hero.webm"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="none"
                    className="h-full w-full rounded-[46%] object-cover"
                    style={{ willChange: 'auto' }}
                  />
                </div>
              </div>

              {/* TEXT BLOCK – full-width web3 headline */}
              <div className="relative z-10 max-w-none lg:max-w-[1100px]">
                <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.3em] text-white/45">
                  On-chain risk &amp; market intel
                </p>

                <h1 className="w-full max-w-none bg-[radial-gradient(89.47%_51.04%_at_44.27%_50%,_#E2E3E9_0%,_#D4D6DE_52.73%,_#3D3F4C_100%)] bg-clip-text pb-4 text-left font-title font-medium leading-[0.9] tracking-[-0.04em] text-transparent text-[clamp(40px,9vw,128px)]">
                  The on-chain backbone.
                  <br />
                  For{" "}
                  <span className="bg-[linear-gradient(180deg,#F2B900_0%,#F9E400_45%,#C8871E_100%)] bg-clip-text text-transparent">
                    BNB
                  </span>{" "}
                  token risk.
                </h1>

                <p className="mt-6 max-w-[620px] text-left text-[16px] leading-snug tracking-tight text-[rgb(148, 151, 158)]  md:text-[rgb(171,174,187)] sm:text-[17px]">
                  SCANAI is the AI risk engine for BNB. It reconstructs contract structure, liquidity and live DEX orderflow into institutional-grade risk scores – then lets an AI analyst sit on top to explain every flag, scenario and edge.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-start gap-3 text-[11px] text-white/60">
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    BNB Mainnet · Read-only
                  </span>
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    No wallet · No API key
                  </span>
                </div>

                {/* HERO CTAs */}
                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-start">
                  <button
                    type="button"
                    onClick={scrollToAnalyzer}
                    className="group relative inline-flex h-10 items-center justify-center rounded-full px-6 text-[15px] font-semibold tracking-tight leading-none outline-none shadow-[0px_2px_2px_0px_rgba(0,0,0,0.74)] transition-colors duration-300 focus:outline-1 focus:outline-offset-4 focus:outline-white md:h-9"
                  >
                    <span className="absolute -inset-px bottom-[-1.5px] rounded-full bg-[linear-gradient(180deg,#fcc171_0%,#C17C56_50%,#362821_100%)]" />
                    <span className="absolute -top-[5px] bottom-0.5 left-1/2 w-[91%] -translate-x-1/2 bg-btn-glowing mix-blend-screen blur-[1px] transition-transform duration-300 ease-in-out group-hover:translate-y-[-2px]" />
                    <span className="absolute inset-0 rounded-full bg-black" />
                    <span className="absolute inset-0 rounded-full bg-btn-glowing-inset opacity-100 transition-opacity duration-300 ease-in-out group-hover:opacity-0" />
                    <span className="absolute inset-0 rounded-full bg-btn-glowing-inset-hover opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
                    <span className="relative z-20 bg-[linear-gradient(180deg,#FFF_33.33%,#E4D0B1_116.67%)] bg-clip-text text-transparent">
                      Run a free scan
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={scrollToMethodology}
                    className="group inline-flex h-10 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-[15px] font-semibold tracking-tight text-white/90 backdrop-blur transition-colors duration-200 hover:bg-white/10 md:h-9"
                  >
                    See methodology
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ANALYZER – hero-style rail */}
          <section
            id="analyzer"
            className="relative bg-black py-12"
          >
            {/* ========= FULL WIDTH WAVY BACKGROUND ========= */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
              <div className="relative w-full h-full min-h-[900px]">
                <WavyBackground
                  backgroundFill="#000000"
                  colors={["#F3BA2F", "#F0B90B", "#C8871E", "#f97316"]}
                  waveWidth={60}
                  blur={11}
                  speed="slow"
                  waveOpacity={0.25}
                  className="w-full h-full"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>

            {/* ========= RADIAL GLOW (ON TOP OF WAVES) ========= */}
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-25 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle at 50% 25%, rgba(242,185,0,0.12), transparent 70%)",
              }}
            />

            {/* ========= HEADER / TITLE BLOCK ========= */}
            <div className="relative z-10 mx-auto mb-10 w-full max-w-6xl px-6 lg:px-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/45 mb-4 text-center md:text-left">
                CONTRACT ANALYZER
              </p>

              <h2
                className="text-[clamp(40px,8vw,104px)] font-title font-medium leading-[0.95] tracking-[-0.04em] 
      text-transparent bg-[radial-gradient(89.47%_51.04%_at_44.27%_50%,_#E2E3E9_0%,_#D4D6DE_52.73%,_#3D3F4C_100%)] bg-clip-text text-center md:text-left pb-2"
              >
                Scan any{" "}
                <span className="bg-gradient-to-b from-[#F2B900] via-[#F9E400] to-[#C8871E] bg-clip-text text-transparent">
                  BNB token
                </span>{" "}
                for complete risk analysis.
              </h2>

              <p className="mt-6 max-w-[620px] text-[16px] text-white/65 sm:text-[17px] leading-snug tracking-tight text-center md:text-left mx-auto md:mx-0">
                Dual-layer analysis across bytecode structure, LP logic and market momentum. The core engine scores the risk; the AI layer turns it into an actionable narrative you can read in seconds.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3 text-[11px] text-white/60">
                <span className="rounded-full bg-white/5 px-3 py-1">
                  BNB Mainnet · Live
                </span>
                <span className="hidden text-white/40 sm:inline">•</span>
                <span className="hidden text-white/60 sm:inline">
                  Read-only · No wallet required
                </span>
              </div>
            </div>

            {/* ========= INPUT FIELD + BUTTON ========= */}
            <div className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-8">
              <div className="relative rounded-full bg-[conic-gradient(from_140deg,#F2B900,rgba(255,255,255,0.12),#F2B900)] p-[1.5px] mb-10">
                <div className="flex flex-col gap-3 rounded-full bg-black px-7 py-7 sm:flex-row sm:items-center sm:px-6 sm:py-3.5">
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.28em] text-white/55 text-center md:text-left">
                      Token contract address
                    </label>

                    <Input
                      type="text"
                      placeholder="0x0000000000000000000000000000000000000000"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                      className="h-11 w-full rounded-full border border-white/20 bg-black px-4 
              font-mono text-xs text-white placeholder:text-white/35 text-center md:text-left
              focus-visible:border-white focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>

                  <div className="sm:ml-4 flex justify-center md:justify-start">
                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={!address.trim()}
                      className="group relative inline-flex h-11 items-center justify-center 
              rounded-full px-7 text-[13px] font-semibold tracking-tight leading-none 
              transition-all duration-300 outline-none focus:outline-1 focus:outline-offset-4 focus:outline-white 
              disabled:cursor-not-allowed disabled:opacity-40 w-full sm:w-auto"
                    >
                      <span
                        className="absolute -inset-px rounded-full bg-gradient-to-b 
              from-[#fcc171] via-[#C17C56] to-[#362821]"
                      />
                      <span className="absolute inset-0 rounded-full bg-black" />
                      <span
                        className="absolute inset-0 rounded-full bg-btn-glowing-inset opacity-100 
              group-hover:opacity-0 transition-opacity duration-300 ease-in-out"
                      />
                      <span
                        className="absolute inset-0 rounded-full bg-btn-glowing-inset-hover opacity-0 
              group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
                      />

                      <span
                        className="relative z-20 bg-gradient-to-b from-white to-[#E4D0B1] 
              bg-clip-text text-transparent"
                      >
                        Run analysis
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ========= PILL CARDS ========= */}
            <div className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-8">
              <div className="flex flex-wrap items-start gap-3 text-white/80 justify-center md:justify-start">
                {[
                  {
                    label: "Structure",
                    desc: "Honeypots, tax logic, owner perms, renounce.",
                  },
                  {
                    label: "Liquidity",
                    desc: "LP lock logic, unlock schedule, pool depth.",
                  },
                  {
                    label: "Market",
                    desc: "Momentum, impact, rugs, crash patterns on BNB.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="group relative inline-flex items-center gap-3 rounded-full border border-white/[0.09] 
          bg-white/[0.015] px-5 py-2.5 text-[11px] backdrop-blur-md 
          transition-all hover:shadow-[0_0_16px_#F2B90022]"
                  >
                    <div className="relative h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#F2B900] to-[#C8871E]">
                      <div className="absolute inset-0 rounded-full blur-sm opacity-40 bg-gradient-to-br from-[#F2B900] to-[#C8871E]" />
                    </div>

                    <div className="leading-tight">
                      <p className="uppercase font-semibold tracking-[0.22em] text-white/70">
                        {item.label}
                      </p>
                      <p className="mt-[1px] text-white/50 text-[10px]">
                        {item.desc}
                      </p>
                    </div>

                    <div
                      className="pointer-events-none absolute inset-0 -z-10 opacity-0 
            transition-opacity duration-300 group-hover:opacity-100"
                    >
                      <div
                        className="absolute inset-0 blur-2xl"
                        style={{
                          background:
                            "radial-gradient(circle at 50% 50%, #F2B90033, transparent 65%)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>

        {/* STACK / RAILS */}
        <section
          id="stack"
          className="relative bg-black py-12"
        >
          {/* right rail like Factory */}
          <div className="pointer-events-none absolute right-6 top-10 hidden h-[420px] flex-col items-center justify-between opacity-70 xl:flex">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 text-white/20"
              >
                <div className="h-12 w-[2px] rounded-full bg-gradient-to-b from-white/10 via-white/40 to-white/5" />
                <div
                  className={`flex h-10 w-4 items-center justify-center rounded-full border ${
                    i === currentPillar
                      ? "border-[rgba(242,185,0,0.9)] bg-[rgba(242,185,0,0.08)]"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === currentPillar
                        ? "bg-[rgba(242,185,0,0.9)]"
                        : "bg-white/30"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* soft background angle */}
     
          <section
            id="scanai-stack"
            className="relative bg-black py-12"
          >
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-20 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle at 40% 30%, rgba(242,185,0,0.2), transparent 60%)",
              }}
            />

            <div className="relative mx-auto w-full max-w-6xl px-6 lg:px-8">
              <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.32em] text-white/40 uppercase">
                    SCANAI STACK
                  </p>
                  <h2 className="mt-3 text-[clamp(40px,8vw,104px)] font-title font-medium leading-[0.88] tracking-[-0.04em] bg-[radial-gradient(89.47%_51.04%_at_44.27%_50%,_#E2E3E9_0%,_#D4D6DE_52.73%,_#3D3F4C_100%)] bg-clip-text text-transparent">
                    On-chain intelligence{" "}
                    <span className="bg-[linear-gradient(180deg,#F2B900_0%,#F9E400_45%,#C8871E_100%)] bg-clip-text text-transparent">
                      rails
                    </span>
                  </h2>
                  <p className="mt-5 max-w-2xl text-[15px] text-white/60 leading-snug">
                    Every analysis is composed from multiple deterministic
                    rails that the AI reads from. Tap one to see the logic and how you call it in code.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <NavCircle onClick={handlePrev} direction="prev" />
                  <NavCircle onClick={handleNext} direction="next" />
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                {/* Left rail list */}
                <GradientFrame className="rounded-2xl border border-white/[0.08] bg-[#050505]/90 p-4">
                  <div className="space-y-2">
                    {PILLARS.map((p, index) => {
                      const active = index === currentPillar;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setCurrentPillar(index)}
                          className={`group flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition ${
                            active
                              ? "bg-white/[0.06] text-white shadow-[0_0_32px_rgba(0,0,0,0.6)]"
                              : "text-white/50 hover:bg-white/[0.02] hover:text-white/80"
                          }`}
                        >
                          <div className="flex flex-1 items-center gap-3">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                active
                                  ? "bg-[rgba(242,185,0,0.9)]"
                                  : "bg-white/30"
                              }`}
                            />
                            <div>
                              <p className="text-sm font-semibold">{p.title}</p>
                              <p className="mt-0.5 text-xs text-white/40">
                                {p.subtitle}
                              </p>
                            </div>
                          </div>
                          <span className="hidden text-xs text-white/30 sm:inline">
                            {p.statValue}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </GradientFrame>

                {/* Right rail details */}
                <GradientFrame className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505]/90">
                  <div className="relative border-b border-white/[0.08] p-6">
                    <div
                      className="pointer-events-none absolute inset-y-0 right-[-60px] w-[220px] opacity-40 blur-3xl"
                      style={{
                        background:
                          "radial-gradient(circle at 0% 50%, rgba(242,185,0,0.4), transparent 60%)",
                      }}
                    />

                    <p className="text-xs text-white/40">{pillar.subtitle}</p>
                    <h3 className="mt-2 text-[30px] font-semibold text-white/90">
                      {pillar.title}
                    </h3>
                    <p className="mt-3 text-sm text-white/60">
                      {pillar.tagline}
                    </p>

                    <div className="mt-5 space-y-2">
                      {pillar.bullets.map((b) => (
                        <p
                          key={b}
                          className="flex items-start gap-2 text-sm text-white/70"
                        >
                          <span className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                          <span>{b}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 border-t border-white/[0.06] bg-black/60 p-6 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.06] bg-black/60 p-4">
                      <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                        Solidity
                      </p>
                      <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-400/90">
                        <code>{pillar.codeSolidity}</code>
                      </pre>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-black/60 p-4">
                      <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                        TypeScript
                      </p>
                      <pre className="overflow-x-auto text-[11px] leading-relaxed text-cyan-400/90">
                        <code>{pillar.codeScript}</code>
                      </pre>
                    </div>
                  </div>
                </GradientFrame>
              </div>
            </div>
          </section>
        </section>
        <section
          id="methodology"
          className="bg-black py-12"
        >
          <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
            {/* Header */}
            <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-[11px] font-medium tracking-[0.32em] text-white/45">
                  METHODOLOGY
                </p>
                <h2 className="mt-3 text-[clamp(40px,8vw,104px)] font-title font-medium leading-[0.88] tracking-[-0.04em] text-transparent bg-[radial-gradient(89.47%_51.04%_at_44.27%_50%,_#E2E3E9_0%,_#D4D6DE_52.73%,_#3D3F4C_100%)] bg-clip-text">
                  How <span className="bg-[linear-gradient(180deg,#F2B900_0%,#F9E400_45%,#C8871E_100%)] bg-clip-text text-transparent">SCANAI</span> scores BNB tokens.
                </h2>
                <div className="mt-5 max-w-2xl space-y-3 text-[15px] text-white/70 leading-relaxed">
                  <p>
                    SCANAI runs on a two-layer engine.
                  </p>
                  <p>
                    At the core is a hard-coded, deterministic risk model that turns raw on-chain data and DEX flow into scores you can replay at any block height. Every penalty, every flag, every survival heuristic is fixed, auditable and documented.
                  </p>
                  <p>
                    On top of that sits an AI analyst that reads those metrics, connects the rails and explains the trade in plain language. The AI can highlight patterns, surface edge cases and answer questions – but it never rewrites the underlying scores.
                  </p>
                </div>
              </div>
              <p className="max-w-xs text-xs text-white/55 lg:text-right">
                Deterministic · Rule-based · Explainable · Replayable
              </p>
            </div>

            {/* 2x2 bento grid */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* 01 – STRUCTURE */}
              <article className="relative flex flex-col items-start border border-white/18 bg-black/90 px-4 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
                {/* corners */}
                <Icon className="pointer-events-none absolute -top-3 -left-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -top-3 -right-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -bottom-3 -left-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-4 w-4 text-white/40" />

                <div className="w-full border border-white/15 bg-black/95 p-3">
                  <div className="h-[230px] w-full overflow-hidden">
                    <EvervaultCard
                      text="01 • STRUCTURE"
                      className="h-full w-full"
                    />
                  </div>
                </div>

                <div className="mt-5 max-w-xl space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                    RISK ENGINE
                  </p>
                  <GradientHeading size="sm" highlight="risk">
                    Structural risk scoring from 100 → 0
                  </GradientHeading>
                  <p className="text-sm leading-relaxed text-white/80">
                    Every token starts at{" "}
                    <span className="font-semibold text-white">100</span>. The engine applies fixed, on-chain penalties for honeypots and transfer taxes (
                    <span className="text-red-400">-50</span>), unlocked or
                    removable liquidity (
                    <span className="text-red-400">-30</span>), dangerous owner
                    permissions, non-renounced contracts, very young age and
                    extreme holder concentration.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-white/75">
                    <span className="rounded-full border border-white/25 px-3 py-1">
                      Honeypots
                    </span>
                    <span className="rounded-full border border-white/25 px-3 py-1">
                      Owner perms
                    </span>
                    <span className="rounded-full border border-white/25 px-3 py-1">
                      LP locks
                    </span>
                    <span className="rounded-full border border-white/25 px-3 py-1">
                      Top holders
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    This rail is the backbone of the global risk score the AI analyst reads and explains.
                  </p>
                </div>
              </article>

              {/* 03 – RUGWATCH */}
              <article className="relative flex flex-col items-start border border-white/18 bg-black/90 px-4 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
                <Icon className="pointer-events-none absolute -top-3 -left-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -top-3 -right-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -bottom-3 -left-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-4 w-4 text-white/40" />

                <div className="w-full border border-white/15 bg-black/95 p-3">
                  <div className="h-[230px] w-full overflow-hidden">
                    <EvervaultCard
                      text="03 • RUGWATCH"
                      className="h-full w-full"
                    />
                  </div>
                </div>

                <div className="mt-5 max-w-xl space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                    PROTECTION
                  </p>
                  <GradientHeading size="sm" highlight="Rug">
                    Rug, crash &amp; drain heuristics
                  </GradientHeading>
                  <p className="text-sm leading-relaxed text-white/80">
                    Detects -80%+ crashes, LP withdrawals, owner dumps and
                    volume collapses. Labels tokens as{" "}
                    <span className="text-emerald-300">rugged</span>,{" "}
                    <span className="text-amber-300">in recovery</span> or{" "}
                    <span className="text-white">structurally stable</span> based on how price, volume and liquidity behave after the hit.
                  </p>
                  <p className="mt-2 text-[11px] text-white/70">
                    -80% events · LP drains · Post-rug behavior
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    Feeds the survival and "is this dead or recovering?" narrative that the AI surfaces in reports.
                  </p>
                </div>
              </article>

              {/* 02 – MOMENTUM */}
              <article className="relative flex flex-col items-start border border-white/18 bg-black/90 px-4 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
                <Icon className="pointer-events-none absolute -top-3 -left-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -top-3 -right-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -bottom-3 -left-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-4 w-4 text-white/40" />

                <div className="w-full border border-white/15 bg-black/95 p-3">
                  <div className="h-[230px] w-full overflow-hidden">
                    <EvervaultCard
                      text="02 • MOMENTUM"
                      className="h-full w-full"
                    />
                  </div>
                </div>

                <div className="mt-5 max-w-xl space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                    MARKET
                  </p>
                  <GradientHeading size="sm" highlight="momentum">
                    Multi-timeframe momentum &amp; volatility
                  </GradientHeading>
                  <p className="text-sm leading-relaxed text-white/80">
                    Weighted trend across 5m / 1h / 6h / 24h windows, real trade
                    direction (not candles), and a velocity layer that tracks
                    acceleration and deceleration of moves.
                  </p>
                  <p className="mt-2 text-[11px] text-white/70">
                    Trend score · Velocity · Buy / sell pressure
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    This rail powers the momentum score and directional bias that the AI turns into trading scenarios.
                  </p>
                </div>
              </article>

              {/* 04 – DATA */}
              <article className="relative flex flex-col items-start border border-white/18 bg-black/90 px-4 py-5 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
                <Icon className="pointer-events-none absolute -top-3 -left-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -top-3 -right-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -bottom-3 -left-3 h-4 w-4 text-white/40" />
                <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-4 w-4 text-white/40" />

                <div className="w-full border border-white/15 bg-black/95 p-3">
                  <div className="h-[230px] w-full overflow-hidden">
                    <EvervaultCard text="04 • DATA" className="h-full w-full" />
                  </div>
                </div>

                <div className="mt-5 max-w-xl space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                    DATA SURFACE
                  </p>
                  <GradientHeading size="sm" highlight="Public">
                    Public data only, no private flow
                  </GradientHeading>
                  <p className="text-sm leading-relaxed text-white/80">
                    Market metrics from DEX aggregators; security checks from
                    GoPlus-style APIs; structure from BNB RPC and explorers. Everything the engine sees can be cross-checked on-chain by the user.
                  </p>
                  <p className="mt-2 text-[11px] text-white/70">
                    DexScreener · GoPlus · RPC · Explorers
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    The AI layer works on the same public surface – no shadow feeds, no hidden data you can't verify.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>




        {/* DECORATIVE SVG SECTION WITH VIDEO */}
        <section className="relative bg-black overflow-hidden">
          <div className="relative z-0 mx-auto aspect-square max-w-[1600px] xl:max-w-[1400px] lg:max-w-[1000px] md:max-w-[800px] sm:max-w-full sm:px-4">
            <div className="relative w-full h-full overflow-hidden rounded-[2rem]">
              {/* Placeholder SVG for aspect ratio */}
              <img 
                className="relative w-full h-full" 
                src="data:image/svg+xml;charset=utf-8,%3Csvg width='1600' height='1600' xmlns='http://www.w3.org/2000/svg' version='1.1'%3E%3C/svg%3E" 
                width="1600" 
                height="1600" 
                alt="" 
                aria-hidden="true"
              />
              
              {/* Image background - SCANAI - Scaled down to fit with text */}
              <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                <img 
                  src="/ddf.png" 
                  alt="SCANAI Background"
                  className="w-[60%] h-auto max-w-[800px] object-contain opacity-80" 
                />
          </div>

              {/* SVG Text Overlay - Fixed positioning for mobile */}
              <div className="absolute inset-0 w-full h-full pointer-events-none z-10 flex items-center justify-center">
                <svg 
                  className="w-full h-full max-w-full max-h-full" 
                  width="1600" 
                  height="960" 
                  viewBox="0 0 1600 960" 
                  preserveAspectRatio="xMidYMid meet"
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g 
                    className="relative transition-transform duration-200" 
                    style={{
                      transformOrigin: '289.434px 138.67px',
                      transform: `translate(${textTransforms.text1?.x || 0}px, ${textTransforms.text1?.y || 0}px)`,
                      willChange: 'transform'
                    }}
                  >
                    <text 
                      x="19%" 
                      y="19%" 
                      fill="white" 
                      fontSize="clamp(32px, 5vw, 48px)"
                      fontWeight="600"
                      className="uppercase"
                      style={{
                        textShadow: '0 0 4px rgba(255,255,255,0.5), 0 0 8px rgba(255,255,255,0.2)',
                        filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))',
                      }}
                    >
                      Reliable
                    </text>
                  </g>
                  <g 
                    className="relative transition-transform duration-200" 
                    style={{ 
                      transformOrigin: '928.73px 184.75px',
                      transform: `translate(${textTransforms.text2?.x || 0}px, ${textTransforms.text2?.y || 0}px)`,
                      willChange: 'transform'
                    }}
                  >
                    <text 
                      x="67.5%" 
                      y="25%" 
                      fill="white" 
                      fontSize="clamp(32px, 5vw, 48px)"
                      fontWeight="600"
                      className="uppercase"
                      style={{
                        textShadow: '0 0 4px rgba(255,255,255,0.5), 0 0 8px rgba(255,255,255,0.2)',
                        filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))',
                      }}
                    >
                      Real-time Data
                    </text>
                  </g>
                  <g 
                    className="relative transition-transform duration-200" 
                    style={{ 
                      transformOrigin: '219.54px 307.63px',
                      transform: `translate(${textTransforms.text3?.x || 0}px, ${textTransforms.text3?.y || 0}px)`,
                      willChange: 'transform'
                    }}
                  >
                    <text 
                      x="9%" 
                      y="41%" 
                      fill="#F2B900" 
                      fontSize="clamp(36px, 6vw, 56px)"
                      fontWeight="700"
                      className="uppercase"
                      style={{
                        textShadow: '0 0 6px rgba(242,185,0,0.6), 0 0 12px rgba(242,185,0,0.3)',
                        filter: 'drop-shadow(0 0 3px rgba(242,185,0,0.5))',
                      }}
                    >
                      AI-Powered Analysis
                    </text>
                  </g>
                  <g 
                    className="relative transition-transform duration-200" 
                    style={{ 
                      transformOrigin: '1041.91px 307.63px',
                      transform: `translate(${textTransforms.text4?.x || 0}px, ${textTransforms.text4?.y || 0}px)`,
                      willChange: 'transform'
                    }}
                  >
                    <text 
                      x="71.5%" 
                      y="41%" 
                      fill="white" 
                      fontSize="clamp(32px, 5vw, 48px)"
                      fontWeight="600"
                      className="uppercase"
                      style={{
                        textShadow: '0 0 4px rgba(255,255,255,0.5), 0 0 8px rgba(255,255,255,0.2)',
                        filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))',
                      }}
                    >
                      Instant Insights
                    </text>
                  </g>
                  <g 
                    className="relative transition-transform duration-200" 
                    style={{ 
                      transformOrigin: '341.483px 576.43px',
                      transform: `translate(${textTransforms.text5?.x || 0}px, ${textTransforms.text5?.y || 0}px)`,
                      willChange: 'transform'
                    }}
                  >
                    <text 
                      x="17%" 
                      y="76%" 
                      fill="white" 
                      fontSize="clamp(28px, 4.5vw, 42px)"
                      fontWeight="600"
                      className="uppercase"
                      style={{
                        textShadow: '0 0 3px rgba(255,255,255,0.5), 0 0 6px rgba(255,255,255,0.2)',
                        filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))',
                        opacity: 0.9,
                      }}
                    >
                      Risk Detection
                    </text>
                  </g>
                  <g 
                    className="relative transition-transform duration-200" 
                    style={{ 
                      transformOrigin: '999.724px 614.83px',
                      transform: `translate(${textTransforms.text6?.x || 0}px, ${textTransforms.text6?.y || 0}px)`,
                      willChange: 'transform'
                    }}
                  >
                    <text 
                      x="68%" 
                      y="81%" 
                      fill="white" 
                      fontSize="clamp(28px, 4.5vw, 42px)"
                      fontWeight="600"
                      className="uppercase"
                      style={{
                        textShadow: '0 0 3px rgba(255,255,255,0.5), 0 0 6px rgba(255,255,255,0.2)',
                        filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))',
                        opacity: 0.9,
                      }}
                    >
                      Market Intelligence
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* CHAT SECTION - Below Video */}
      <ChatTeaserSection />
      <section
  id="about"
  className="relative bg-black py-16 lg:py-20 overflow-hidden"
>
  {/* Soft, minimal background – more corporate, less degen */}
  <div
    className="pointer-events-none absolute inset-0 -z-10 opacity-70"
            style={{
              background:
        "radial-gradient(circle at 70% 0%, rgba(242,185,0,0.18), transparent 60%)",
            }}
          />

          <div className="relative mx-auto w-full max-w-6xl px-6 lg:px-8">
    {/* HEADER ROW */}
    <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.3em] text-white/45">
                Built for transparency &amp; rigor
              </p>
        <h2 className="text-left font-title font-medium tracking-[-0.04em] text-[clamp(40px,8vw,104px)] leading-[0.88] text-transparent bg-[radial-gradient(89.47%_51.04%_at_44.27%_50%,_#E2E3E9_0%,_#D4D6DE_52.73%,_#3D3F4C_100%)] bg-clip-text">
                Built for{" "}
                <span className="bg-[linear-gradient(180deg,#F2B900_0%,#F9E400_45%,#C8871E_100%)] bg-clip-text text-transparent">
                  traders
                </span>{" "}
                who hate vibes-only risk.
              </h2>
        <p className="mt-4 max-w-[640px] text-left text-[15px] leading-snug tracking-tight text-white/70 sm:text-[16px]">
          SCANAI is an institutional-grade risk stack for BNB – a deterministic engine that scores structure, liquidity and flow, with an AI research desk sitting on top. It turns raw on-chain and DEX data into scores, narratives and scenarios instead of screenshots and hopium.
              </p>
            </div>

      {/* small, corporate-looking stat pills */}
      <div className="flex flex-wrap gap-2 text-[11px] text-white/70">
        {[
          "Deterministic · Replayable",
          "Explainable scoring",
          "Public data only",
        ].map((pill) => (
          <span
            key={pill}
            className="rounded-full border border-white/14 bg-[#111113] px-3 py-1"
          >
            {pill}
          </span>
        ))}
      </div>
    </div>

    {/* MAIN GRID */}
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* LEFT – STORY + STATS */}
              <div className="space-y-8">
        {/* STORY CARD */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#111113] px-6 py-6 sm:px-7 sm:py-7 shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
          <div className="space-y-6 text-[14px] sm:text-[15px] leading-relaxed tracking-tight text-white/75">
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
                Why SCANAI
              </p>
              <p>
                SCANAI is built for traders, researchers and due-diligence teams
                who live in BNB degen flow but demand structural signal before
                they ape. It gives you the rails behind the score and an AI that can walk you through them.
              </p>
            </div>

            <div className="h-px w-full bg-white/[0.08]" />

            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
                Mission
                  </p>
                  <p>
                    The mission is simple: democratize access to real token intelligence — transparent rules,
                    transparent penalties, no paywalls. If SCANAI calls a token
                    risky, you can open the rails and see exactly why.
                  </p>
            </div>

            <div className="h-px w-full bg-white/[0.08]" />

            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
                Guarantees
                  </p>
                  <p>
                Under the hood, SCANAI is not vibes – it's rails. Given the same block
                height and inputs, the engine will always produce the same score. The AI layer lives above that to interpret the call – it can't secretly change the risk, and it doesn't have hidden weights drifting in the background.
                  </p>
            </div>
          </div>
                </div>

        {/* SMALL STATS ROW */}
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { label: "Engine", value: "Deterministic · Rule-based · AI-assisted" },
            { label: "Focus", value: "BNB degen & mid-cap flow" },
            { label: "Access", value: "Free scans · No wallet" },
                  ].map((item) => (
                    <div
                      key={item.label}
              className="rounded-2xl border border-white/[0.08] bg-[#0B0B0D] px-4 py-4 text-left"
                    >
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/55">
                        {item.label}
                      </p>
              <p className="text-[13px] font-medium leading-relaxed text-white/90">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

      {/* RIGHT – DISCLAIMER CARD */}
      <aside>
        <div className="sticky top-24 rounded-3xl border border-white/[0.12] bg-[#111113] px-6 py-6 sm:px-7 sm:py-7 text-xs leading-relaxed text-white/75 shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
                  <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.25] bg-black/60">
              <span className="text-base leading-none font-semibold text-white">
                !
              </span>
                    </div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
                      Disclaimer — not investment advice
                    </p>
                  </div>

                  <div className="space-y-3 text-[13px]">
                    <p>
                      SCANAI is an informational and educational tool. It does not
              provide financial, investment, legal, or tax advice, and it does
              not recommend buying or selling any token.
                    </p>
                    <p>
              Crypto markets are highly volatile and speculative. Always do your
              own research, understand the risks, and consult qualified
              professionals before making decisions. Past behavior and technical
              indicators do not guarantee future results.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

/* === Small helpers === */

function NavCircle({
  onClick,
  direction,
}: {
  onClick: () => void;
  direction: "prev" | "next";
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-white/60 transition hover:bg-white/[0.06] hover:text-white"
      aria-label={direction === "prev" ? "Previous rail" : "Next rail"}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <path
          d={direction === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function GradientHeading({
  children,
  className = "",
  size = "lg",
  highlight,
}: {
  children: React.ReactNode;
  className?: string;
  size?: "lg" | "md" | "sm";
  highlight?: string;
}) {
  const sizeMap: Record<"lg" | "md" | "sm", string> = {
    lg: "text-3xl sm:text-4xl lg:text-[38px] leading-tight",
    md: "text-2xl sm:text-3xl leading-snug",
    sm: "text-[18px] sm:text-[19px] leading-snug",
  };

  const baseClasses = `font-semibold tracking-tight text-white ${sizeMap[size]} ${className}`;

  // If no highlight or children isn't a plain string → render normal heading
  if (
    !highlight ||
    typeof children !== "string" ||
    !children.includes(highlight)
  ) {
    return <h2 className={baseClasses}>{children}</h2>;
  }

  const [before, after] = children.split(highlight);

  return (
    <h2 className={baseClasses}>
      {before}
      <span className="bg-[linear-gradient(180deg,#F2B900_0%,#F9E400_45%,#C8871E_100%)] bg-clip-text text-transparent">
        {highlight}
      </span>
      {after}
    </h2>
  );
}

function GradientFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[32px] border border-white/[0.14] bg-[radial-gradient(circle_at_0%_0%,rgba(242,185,0,0.16),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(242,185,0,0.18),transparent_55%),#000000] shadow-[0_26px_80px_rgba(0,0,0,0.9)] backdrop-blur-xl ${className}`}
    >
      <div className="relative h-full w-full bg-black/85">{children}</div>
    </div>
  );
}
