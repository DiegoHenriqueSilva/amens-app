import React from "react";
import { useCurrentFrame, interpolate, useVideoConfig } from "remotion";

interface FlowVisualsProps {
  level?: number; // 0 to 5 (mapped to intensity)
}

// Simple custom noise function instead of @remotion/noise
const organicNoise = (seed: number, t: number) => {
  return (
    Math.sin(seed + t * 0.4) * 0.45 +
    Math.sin(seed * 2.1 + t * 0.9) * 0.3 +
    Math.cos(seed * 0.6 + t * 1.5) * 0.25
  );
};

const FlowVisuals: React.FC<FlowVisualsProps> = ({ level = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // Overall brightness and density based on level
  const globalOpacity = 0.5 + (level * 0.1);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="organicFlowGradient" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFD700" stopOpacity={0.6 * globalOpacity} />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </linearGradient>

        <filter id="glowBlur">
          <feGaussianBlur stdDeviation="3" result="blur" />
        </filter>
      </defs>

      {/* 1. ORGANIC FLOW LINES (Bezier Paths with Custom Noise) */}
      {[...Array(6 + level)].map((_, i) => {
        const seed = i * 137.5;
        const yBase = (seed % height);
        
        // Use custom noise to warp the path over time
        const t = frame / 100;
        const drift = organicNoise(seed, t) * 120;
        const midX = width / 2;
        const midY = yBase + drift;
        
        const endDrift = organicNoise(seed + 10, t * 1.2) * 80;
        const pathData = `M -50 ${yBase} Q ${midX} ${midY} ${width + 50} ${yBase + endDrift}`;

        return (
          <path
            key={`grace-line-${i}`}
            d={pathData}
            stroke="url(#organicFlowGradient)"
            strokeWidth={1.5 + (i % 2)}
            fill="none"
            opacity={0.25 * globalOpacity}
            style={{ filter: 'url(#glowBlur)' }}
          />
        );
      })}

      {/* 2. LEAVES (Floating and Rotating) */}
      {[...Array(4 + level)].map((_, i) => {
        const seed = i * 243;
        const yBase = (seed % height);
        const speed = 2 + (seed % 3);
        const xPos = ((seed + frame * speed) % (width + 200)) - 100;
        
        // Organic drift using custom noise
        const nt = frame / 80;
        const noiseY = organicNoise(seed, nt) * 150;
        const rotation = (frame * (3 + (seed % 5))) % 360;
        
        return (
          <g key={`leaf-${i}`} transform={`translate(${xPos}, ${yBase + noiseY}) rotate(${rotation})`}>
            {/* Simple Leaf Shape */}
            <path
              d="M 0 0 C 5 -5 15 -5 20 0 C 15 5 5 5 0 0"
              fill="#D4AF37"
              opacity={0.4 * globalOpacity}
            />
          </g>
        );
      })}

      {/* 3. BIRDS (Peace Doves - Flapping V Animation) */}
      {[...Array(2 + Math.floor(level / 2))].map((_, i) => {
        const seed = i * 512;
        const yBase = 50 + (seed % (height - 100));
        const speed = 2.5 + (seed % 2.5);
        const xPos = ((seed + frame * speed) % (width + 400)) - 200;
        
        // Wing flap animation
        const flap = Math.abs(Math.sin(frame / 6)) * 12;
        const bt = frame / 150;
        const driftY = organicNoise(seed + 50, bt) * 100;

        return (
          <g key={`bird-${i}`} transform={`translate(${xPos}, ${yBase + driftY})`}>
             <path
               d={`M -12 ${-flap} L 0 0 L 12 ${-flap}`} // Improved flapping V shape
               stroke="#FFD700"
               strokeWidth="2.5"
               strokeLinecap="round"
               strokeLinejoin="round"
               fill="none"
               opacity={0.6 * globalOpacity}
             />
          </g>
        );
      })}

      {/* 4. GLITTER PARTICLES (Ethereal dust) */}
      {[...Array(10 + level * 5)].map((_, i) => {
        const seed = i * 89;
        const yBase = (seed % height);
        const speed = 1.5 + (seed % 3.5);
        const xPos = ((seed + frame * speed) % (width + 100)) - 50;
        const pt = frame / 60;
        const noiseDrift = organicNoise(seed, pt) * 45;
        
        const pSize = interpolate(Math.sin((frame + seed) / 20), [-1, 1], [0.5, 2]);

        return (
          <circle
            key={`glitter-${i}`}
            cx={xPos}
            cy={yBase + noiseDrift}
            r={pSize}
            fill="#FFFFFF"
            opacity={0.3 * globalOpacity}
          />
        );
      })}
    </svg>
  );
};

export default FlowVisuals;
