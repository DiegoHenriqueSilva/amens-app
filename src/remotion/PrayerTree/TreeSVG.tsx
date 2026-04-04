import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface TreeSVGProps {
  level?: number; // 0 to 5
}

const TreeSVG: React.FC<TreeSVGProps> = ({ level = 1 }) => {
  const frame = useCurrentFrame();

  // Gentle swaying effect
  const sway = Math.sin(frame / 45) * 1.5;
  const leafSway = Math.sin(frame / 20) * 3;
  
  // Growth Factor: Controls how much of the tree is shown
  // Level 1: Small/Young, Level 5: Full/Majestic
  const growthFactor = level / 5; 
  const trunkScale = interpolate(level, [0, 5], [0.4, 1]);
  const leafOpacity = interpolate(level, [1, 2, 5], [0.2, 0.5, 0.8]);

  return (
    <svg
      width="400"
      height="450"
      viewBox="0 0 400 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: `drop-shadow(0 0 ${20 + level * 5}px rgba(212, 175, 55, ${0.1 + level * 0.05}))`,
        transformOrigin: "bottom center",
        transform: `scale(${trunkScale})`,
      }}
    >
      <defs>
        <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4E342E" />
          <stop offset="50%" stopColor="#6D4C41" />
          <stop offset="100%" stopColor="#3E2723" />
        </linearGradient>
        
        <radialGradient id="leafGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.6" />
        </radialGradient>

        <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="40%" stopColor="#FFFAE0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
        
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="200" cy="445" rx={60 + level * 10} ry="10" fill="rgba(62, 39, 35, 0.15)" />

      {/* TRUNK */}
      <g style={{ transform: `rotate(${sway * 0.2}deg)`, transformOrigin: "200px 450px" }}>
        <path
          d="M185 450C190 400 180 300 195 200C205 100 230 60 200 20"
          stroke="url(#trunkGradient)"
          strokeWidth={12 + level * 1.5}
          strokeLinecap="round"
          style={{ transition: 'stroke-width 1s ease' }}
        />
      </g>

      {/* BRANCHES (Progressive reveal based on level) */}
      
      {level >= 2 && (
        <g style={{ transform: `rotate(${sway * 1.8}deg)`, transformOrigin: "190px 320px" }}>
          <path d="M190 330C150 310 100 300 60 260" stroke="#5D4037" strokeWidth="6" strokeLinecap="round" />
        </g>
      )}

      {level >= 2 && (
        <g style={{ transform: `rotate(${sway * -1.5}deg)`, transformOrigin: "210px 300px" }}>
          <path d="M205 310C260 300 300 280 340 240" stroke="#5D4037" strokeWidth="6" strokeLinecap="round" />
        </g>
      )}

      {level >= 3 && (
        <g style={{ transform: `rotate(${sway * 2.5}deg)`, transformOrigin: "200px 220px" }}>
          <path d="M198 230C160 200 120 190 80 160" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}

      {level >= 3 && (
        <g style={{ transform: `rotate(${sway * -2.2}deg)`, transformOrigin: "205px 180px" }}>
          <path d="M200 190C250 170 300 150 330 110" stroke="#5D4037" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}

      {/* FOLIAGE */}
      {[
        { x: 200, y: 40, r: 40, minLevel: 1 },
        { x: 60, y: 260, r: 35, minLevel: 2 },
        { x: 340, y: 240, r: 35, minLevel: 2 },
        { x: 80, y: 160, r: 30, minLevel: 3 },
        { x: 330, y: 110, r: 30, minLevel: 3 },
        { x: 140, y: 100, r: 25, minLevel: 4 },
        { x: 270, y: 80, r: 25, minLevel: 4 },
        { x: 190, y: 140, r: 30, minLevel: 5 },
        { x: 230, y: 210, r: 25, minLevel: 5 },
      ].map((cluster, i) => {
        if (level < cluster.minLevel) return null;
        
        const pulse = interpolate(Math.sin((frame + i * 15) / 25), [-1, 1], [0.96, 1.04]);
        const rotate = leafSway * (i % 2 === 0 ? 1 : -1);
        
        return (
          <g key={`cluster-${i}`} style={{ transform: `scale(${pulse}) rotate(${rotate}deg)`, transformOrigin: `${cluster.x}px ${cluster.y}px` }}>
             <circle cx={cluster.x} cy={cluster.y} r={cluster.r + level * 2} fill="url(#leafGradient)" style={{ opacity: leafOpacity }} />
          </g>
        );
      })}

      {/* PRAYER FRUITS */}
      {level >= 3 && [...Array(level * 3)].map((_, i) => {
        const xPos = 100 + (i * 25) % 200;
        const yPos = 50 + (i * 45) % 250;
        const dx = Math.sin((frame + i * 20) / 40) * 10;
        const dy = Math.cos((frame + i * 35) / 50) * 15;
        const glowPulse = interpolate(Math.sin((frame + i * 12) / 15), [-1, 1], [0.4, 0.9]);
        
        return (
          <g key={`fruit-${i}`} filter="url(#glow)">
            <circle
              cx={xPos + dx}
              cy={yPos + dy}
              r={interpolate(Math.sin((frame + i * 8) / 20), [-1, 1], [2, 5])}
              fill="url(#glowGradient)"
              opacity={glowPulse}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default TreeSVG;
