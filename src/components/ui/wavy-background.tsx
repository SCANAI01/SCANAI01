"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { createNoise3D } from "simplex-noise";

export const WavyBackground = React.memo(({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
  ...props
}: {
  children?: any;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
  [key: string]: any;
}) => {
  const noise = createNoise3D();
  let w: number,
    h: number,
    nt: number,
    i: number,
    x: number,
    ctx: any,
    canvas: any;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const getSpeed = () => {
    switch (speed) {
      case "slow":
        return 0.001;
      case "fast":
        return 0.002;
      default:
        return 0.001;
    }
  };

  const init = () => {
    canvas = canvasRef.current;
    ctx = canvas.getContext("2d");
    w = ctx.canvas.width = window.innerWidth;
    h = ctx.canvas.height = window.innerHeight;
    ctx.filter = `blur(${blur}px)`;
    nt = 0;
    window.onresize = function () {
      w = ctx.canvas.width = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
    };
    render();
  };

  const waveColors = colors ?? [
    "#38bdf8",
    "#818cf8",
    "#c084fc",
    "#e879f9",
    "#22d3ee",
  ];
  const drawWave = (n: number) => {
    nt += getSpeed();
    // Reduced from 5 waves to 3 for better performance
    const numWaves = Math.min(n, 3);
    for (i = 0; i < numWaves; i++) {
      ctx.beginPath();
      ctx.lineWidth = waveWidth || 50;
      ctx.strokeStyle = waveColors[i % waveColors.length];
      // Increased step size from 5 to 10 for better performance (fewer calculations)
      for (x = 0; x < w; x += 10) {
        var y = noise(x / 800, 0.3 * i, nt) * 100;
        ctx.lineTo(x, y + h * 0.5); // adjust for height, currently at 50% of the container
      }
      ctx.stroke();
      ctx.closePath();
    }
  };

  let animationId: number;
  let isActive = true;
  let lastFrameTime = 0;
  const targetFPS = 30; // Reduced from 60fps to 30fps for better performance
  const frameInterval = 1000 / targetFPS;

  const render = (currentTime: number) => {
    if (!isActive) return;
    
    // Throttle to 30fps instead of 60fps
    if (currentTime - lastFrameTime >= frameInterval) {
      ctx.fillStyle = backgroundFill || "black";
      ctx.globalAlpha = waveOpacity || 0.5;
      ctx.fillRect(0, 0, w, h);
      drawWave(3); // Reduced from 5 to 3 waves
      lastFrameTime = currentTime;
    }
    animationId = requestAnimationFrame(render);
  };

  useEffect(() => {
    init();
    lastFrameTime = performance.now();
    animationId = requestAnimationFrame(render);
    
    // Pause animation when page is hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        isActive = false;
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      } else {
        isActive = true;
        lastFrameTime = performance.now();
        animationId = requestAnimationFrame(render);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      isActive = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    // I'm sorry but i have got to support it on safari.
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome")
    );
  }, []);

  return (
    <div
      className={cn(
        "h-screen flex flex-col items-center justify-center",
        containerClassName
      )}
    >
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={{
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }}
      ></canvas>
      <div className={cn("relative z-10", className)} {...props}>
        {children}
      </div>
    </div>
  );
});
