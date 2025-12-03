import { useQuery } from "@tanstack/react-query";

export function useTokenLogo(address?: string, chain: string = "bsc") {
  const { data, isLoading } = useQuery<string | undefined, Error>({
    queryKey: ["token-logo", chain, address?.toLowerCase()],
    enabled: !!address,
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!address) return undefined;
      
      try {
        const resp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        if (!resp.ok) throw new Error("DexScreener API failed");
        
        const json = await resp.json();
        const pairs = json?.pairs ?? [];
        
        // Priority 1: info.imageUrl from any pair
        const imageUrl = pairs.find((p: any) => p?.info?.imageUrl)?.info?.imageUrl;
        if (imageUrl) return imageUrl;
        
        // Priority 2: info.openGraph from any pair
        const openGraph = pairs.find((p: any) => p?.info?.openGraph)?.info?.openGraph;
        if (openGraph) return openGraph;
        
      } catch (err) {
        console.warn('DexScreener fetch failed:', err);
      }
      
      // Fallback: DexScreener CDN token-images path
      return `https://cdn.dexscreener.com/token-images/${chain}/${address.toLowerCase()}.png`;
    },
  });

  return { logoUrl: data, isLoading };
}
