import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

const TreeSVG: React.FC = () => {
  const frame = useCurrentFrame();

  // Gentle swaying effect using a sinusoidal wave
  const sway = Math.sin(frame / 30) * 2; // 2 degrees of sway
  const leafSway = Math.sin(frame / 15) * 5;

  return (
    <svg
      width="400"
      height="450"
      viewBox="0 0 400 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: "drop-shadow(0 0 20px rgba(212, 175, 55, 0.2))",
        transform: `rotate(${sway}deg)`,
        transformOrigin: "bottom center",
        transition: "transform 0.1s ease-out",
      }}
    >
      {/* Trunk */}
      <path
        d="M200 450C210 400 220 350 200 250C180 150 150 100 200 50"
        stroke="#5D4037"
        strokeWidth="12"
        strokeLinecap="round"
      />
      
      {/* Main Branches */}
      <g style={{ transform: `rotate(${sway * 1.5}deg)`, transformOrigin: "200px 300px" }}>
        <path d="M205 320C240 280 280 260 320 240" stroke="#5D4037" strokeWidth="8" strokeLinecap="round" />
        <path d="M195 320C160 280 120 260 80 240" stroke="#5D4037" strokeWidth="8" strokeLinecap="round" />
      </g>
      
      <g style={{ transform: `rotate(${sway * -1.2}deg)`, transformOrigin: "200px 200px" }}>
        <path d="M200 220C250 180 290 160 330 140" stroke="#5D4037" strokeWidth="6" strokeLinecap="round" />
        <path d="M200 220C150 180 110 160 70 140" stroke="#5D4037" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* Stylized Leaves / Spirit Glow */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = 200 + Math.cos(angle) * 100;
        const y = 180 + Math.sin(angle) * 80;
        const scale = interpolate(Math.sin((frame + i * 10) / 20), [-1, 1], [0.8, 1.2]);
        
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={15}
            fill="url(#leafGradient)"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: `${x}px ${y}px`,
              opacity: 0.7,
            }}
          />
        );
      })}

      <defs>
        <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFACD" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default TreeSVG;
