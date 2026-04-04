import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface FlowVisualsProps {
  level?: number; // 0 to 5 (mapped to intensity)
}

const FlowVisuals: React.FC<FlowVisualsProps> = ({ level = 1 }) => {
  const frame = useCurrentFrame();
  
  // Overall brightness based on level
  const globalOpacity = 0.5 + (level * 0.1);

  return (
    <svg
      width="400"
      height="450"
      viewBox="0 0 400 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        overflow: "visible",
      }}
    >
      <defs>
        {/* Divine Golden Gradients */}
        <linearGradient id="flowGradient" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFD700" stopOpacity={0.4 * globalOpacity} />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="particleGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="40%" stopColor="#FFFACD" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>

        <filter id="divineBlur">
          <feGaussianBlur stdDeviation="6" result="blur" />
        </filter>
      </defs>

      {/* 1. GRACE LINES (Horizontal Streaks) */}
      {[...Array(8 + level * 2)].map((_, i) => {
        const seed = i * 45;
        const yPos = (seed % 400) + 25;
        const speed = 1 + (seed % 3);
        const dashOffset = (frame * speed * 2) % 1000;
        const lineOpacity = interpolate(Math.sin((frame + i * 30) / 40), [-1, 1], [0.1, 0.3 * globalOpacity]);
        
        return (
          <line
            key={`line-${i}`}
            x1="-100"
            y1={yPos}
            x2="500"
            y2={yPos + (Math.sin(frame / 60 + i) * 5)} // Slight wave
            stroke="url(#flowGradient)"
            strokeWidth={1 + (i % 3)}
            strokeDasharray="150 450"
            strokeDashoffset={-dashOffset}
            opacity={lineOpacity}
          />
        );
      })}

      {/* 2. FLOWING PARTICLES (Ethereal Grace) */}
      {[...Array(15 + level * 5)].map((_, i) => {
        const seed = i * 79;
        const yBase = (seed % 400) + 25;
        const speed = 2 + (seed % 4);
        const xPos = ((seed + frame * speed) % 600) - 100;
        const drift = Math.sin((frame + i * 20) / 40) * 15;
        
        const pSize = interpolate(Math.sin((frame + i * 15) / 20), [-1, 1], [0.8, 2.5]);
        const pOpacity = interpolate(Math.sin((frame + i * 25) / 40), [-1, 1], [0.1, 0.6 * globalOpacity]);

        return (
          <circle
            key={`grace-particle-${i}`}
            cx={xPos}
            cy={yBase + drift}
            r={pSize}
            fill="#FFD700"
            opacity={pOpacity}
            style={{ filter: 'blur(0.5px)' }}
          />
        );
      })}

      {/* 3. CENTRAL GLOW CONDUIT */}
      <rect
        x="0"
        y="150"
        width="400"
        height="150"
        fill="url(#flowGradient)"
        opacity={0.15 * globalOpacity}
        style={{ filter: 'url(#divineBlur)' }}
      />
    </svg>
  );
};

export default FlowVisuals;
