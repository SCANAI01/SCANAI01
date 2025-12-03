import React from "react";

interface ChartEmbedProps {
  pairAddress?: string;
  chain?: string; // e.g., 'bsc'
}

const ChartEmbed: React.FC<ChartEmbedProps> = ({ pairAddress, chain = 'bsc' }) => {
  if (!pairAddress) return null;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <iframe
        src={`https://dexscreener.com/${chain}/${pairAddress}?embed=1&chart=1&trades=0&info=0&theme=dark`}
        className="h-[520px] w-full"
        loading="lazy"
        allow="clipboard-write; encrypted-media"
        title="Price Chart"
      />
    </div>
  );
};

export default ChartEmbed;
