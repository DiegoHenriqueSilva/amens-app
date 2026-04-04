import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface TreeSVGProps {
  level?: number; // 0 to 5
}

const TreeSVG: React.FC<TreeSVGProps> = ({ level = 1 }) => {
  const frame = useCurrentFrame();

  // Gentle swaying effect
  const sway = Math.sin(frame / 60) * 1.2;
  const leafSway = Math.sin(frame / 25) * 4;
  
  const trunkScale = interpolate(level, [0, 5], [0.5, 1], { extrapolateRight: "clamp" });
  const leafOpacity = interpolate(level, [1, 2, 5], [0.3, 0.6, 0.9]);

  return (
    <svg
      width="400"
      height="450"
      viewBox="0 0 400 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: `drop-shadow(0 0 ${25 + level * 8}px rgba(212, 175, 55, ${0.15 + level * 0.05}))`,
        transformOrigin: "bottom center",
        transform: `scale(${trunkScale})`,
      }}
    >
      <defs>
        {/* Divine Gradients */}
        <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3E2723" />
          <stop offset="50%" stopColor="#5D4037" />
          <stop offset="100%" stopColor="#2D1B18" />
        </linearGradient>
        
        <radialGradient id="leafGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
          <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#B8860B" stopOpacity="0.4" />
        </radialGradient>

        <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="40%" stopColor="#FFFACD" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="rayGradient" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFD700" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </linearGradient>
        
        <filter id="divineGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. DIVINE RAYS (Background) */}
      {level >= 3 && [...Array(6)].map((_, i) => {
        const angle = (i / 6) * 180 - 90;
        const rayOpacity = interpolate(Math.sin((frame + i * 40) / 50), [-1, 1], [0.1, 0.4]);
        return (
          <rect
            key={`ray-${i}`}
            x="190"
            y="-100"
            width="20"
            height="500"
            fill="url(#rayGradient)"
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: "200px 300px",
              opacity: rayOpacity
            }}
          />
        );
      })}

      {/* 2. GROUND SHADOW */}
      <ellipse cx="200" cy="440" rx={70 + level * 15} ry="12" fill="rgba(62, 39, 35, 0.2)" />

      {/* 3. THE TRUNK (More detailed) */}
      <g style={{ transform: `rotate(${sway * 0.3}deg)`, transformOrigin: "200px 450px" }}>
        {/* Shadow layer */}
        <path
          d="M190 450C195 400 185 300 200 200C210 100 230 60 200 20"
          stroke="#2D1B18"
          strokeWidth={14 + level * 2}
          strokeLinecap="round"
          opacity="0.3"
          transform="translate(4, 0)"
        />
        {/* Main trunk */}
        <path
          d="M185 450C190 400 180 300 195 200C205 100 235 60 200 20"
          stroke="url(#trunkGradient)"
          strokeWidth={13 + level * 2}
          strokeLinecap="round"
        />
      </g>

      {/* 4. BRANCHES (With sub-branching) */}
      {level >= 2 && (
        <g style={{ transform: `rotate(${sway * 1.5}deg)`, transformOrigin: "190px 330px" }}>
          <path d="M190 330C150 310 100 300 60 260" stroke="#5D4037" strokeWidth="7" strokeLinecap="round" />
          <path d="M130 315C110 290 80 290 50 295" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {level >= 2 && (
        <g style={{ transform: `rotate(${sway * -1.2}deg)`, transformOrigin: "210px 310px" }}>
          <path d="M205 315C260 305 320 280 350 240" stroke="#5D4037" strokeWidth="7" strokeLinecap="round" />
          <path d="M280 300C310 280 330 280 360 285" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {level >= 3 && (
        <g style={{ transform: `rotate(${sway * 2.2}deg)`, transformOrigin: "200px 220px" }}>
          <path d="M198 230C160 200 120 190 80 150" stroke="#5D4037" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}

      {level >= 3 && (
        <g style={{ transform: `rotate(${sway * -2.0}deg)`, transformOrigin: "205px 190px" }}>
          <path d="M200 190C250 170 310 150 340 100" stroke="#5D4037" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}

      {/* 5. LUSH FOLIAGE (Layered leaf clusters) */}
      {[
        { x: 200, y: 40, r: 45, minLevel: 1 },
        { x: 60, y: 260, r: 40, minLevel: 2 },
        { x: 350, y: 240, r: 40, minLevel: 2 },
        { x: 80, y: 150, r: 35, minLevel: 3 },
        { x: 340, y: 100, r: 35, minLevel: 3 },
        { x: 140, y: 80, r: 30, minLevel: 4 },
        { x: 270, y: 60, r: 30, minLevel: 4 },
        { x: 190, y: 120, r: 35, minLevel: 5 },
        { x: 230, y: 190, r: 30, minLevel: 5 },
      ].map((cluster, i) => {
        if (level < cluster.minLevel) return null;
        
        const pulse = interpolate(Math.sin((frame + i * 20) / 30), [-1, 1], [0.97, 1.03]);
        const rotate = leafSway * (i % 2 === 0 ? 1 : -1);
        
        return (
          <g 
            key={`cluster-${i}`} 
            style={{ 
               transform: `scale(${pulse}) rotate(${rotate}deg)`, 
               transformOrigin: `${cluster.x}px ${cluster.y}px`,
               filter: 'url(#divineGlow)'
            }}
          >
             {/* Sub-blobs for depth */}
             <circle cx={cluster.x} cy={cluster.y} r={cluster.r + level * 3} fill="url(#leafGradient)" style={{ opacity: leafOpacity }} />
             <circle cx={cluster.x - cluster.r/2} cy={cluster.y - cluster.r/3} r={cluster.r/1.5} fill="#FFD700" style={{ opacity: leafOpacity * 0.4 }} />
             <circle cx={cluster.x + cluster.r/2} cy={cluster.y + cluster.r/3} r={cluster.r/1.8} fill="#FFFACD" style={{ opacity: leafOpacity * 0.3 }} />
          </g>
        );
      })}

      {/* 6. GLITTER PARTICLES (Divine Grace) */}
      {[...Array(20)].map((_, i) => {
        const seed = i * 137;
        const xPos = (seed % 300) + 50;
        const yPos = (seed % 350) + 20;
        const driftX = Math.sin((frame + i * 20) / 50) * 15;
        const driftY = Math.cos((frame + i * 30) / 70) * 20;
        const pSize = interpolate(Math.sin((frame + i * 15) / 20), [-1, 1], [1, 3]);
        const pOpacity = interpolate(Math.sin((frame + i * 25) / 40), [-1, 1], [0.1, 0.8]);

        return (
          <circle
            key={`glitter-${i}`}
            cx={xPos + driftX}
            cy={yPos + driftY}
            r={pSize}
            fill="#FFD700"
            opacity={pOpacity}
            style={{ filter: 'blur(0.5px)' }}
          />
        );
      })}

      {/* 7. PRAYER FRUITS (Glow spheres) */}
      {level >= 2 && [...Array(level * 4)].map((_, i) => {
        const xPos = 120 + (i * 30) % 180;
        const yPos = 60 + (i * 50) % 280;
        const drift = Math.sin((frame + i * 20) / 40) * 8;
        const glowPulse = interpolate(Math.sin((frame + i * 15) / 20), [-1, 1], [0.3, 1]);
        
        return (
          <g key={`fruit-${i}`} filter="url(#divineGlow)">
            <circle
              cx={xPos + drift}
              cy={yPos + drift}
              r={interpolate(Math.sin((frame + i * 10) / 25), [-1, 1], [3, 7])}
              fill="url(#glowGradient)"
              opacity={glowPulse * 0.9}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default TreeSVG;
