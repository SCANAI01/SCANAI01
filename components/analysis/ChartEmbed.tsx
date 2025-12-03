"use client";

interface ChartEmbedProps {
  pairAddress: string;
  chain: string;
}

export default function ChartEmbed({ pairAddress, chain }: ChartEmbedProps) {
  // Simple embed URL - DexScreener will automatically show both chart and info side by side
  // when the container is wide enough (800-1000px minimum).
  // The container needs to be at least 1000px wide for both panels to show side by side
  const embedUrl = `https://dexscreener.com/${chain}/${pairAddress}?embed=1&theme=dark`;
  
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40" style={{ minWidth: '1000px' }}>
      <iframe
        src={embedUrl}
        className="h-[600px] w-full"
        loading="lazy"
        allow="clipboard-write; encrypted-media"
        title="Price Chart"
        style={{ minWidth: '1000px' }}
      />
    </div>
  );
}
