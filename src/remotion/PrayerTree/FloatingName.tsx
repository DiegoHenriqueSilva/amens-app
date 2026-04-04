import React, { useMemo } from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";

interface FloatingNameProps {
  name: string;
  delay: number;
}

const FloatingName: React.FC<FloatingNameProps> = ({ name, delay }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // The animation starts at frame 'delay'
  const startFrame = delay;
  const relativeFrame = frame - startFrame;

  // We want the name to float for a specific duration
  const duration = 150; // A bit slower for a more peaceful feel

  // Opacity: Fade in and out
  const opacity = interpolate(
    relativeFrame,
    [0, 25, duration - 30, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Vertical Movement: From the middle area upwards
  const y = interpolate(
    relativeFrame,
    [0, duration],
    [height * 0.65, -50],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Horizontal Movement (Wind Effect): Side dispersal + Sinusoidal wave
  const xOffset = useMemo(() => (Math.random() - 0.5) * 280, []); 
  
  const windEffect = Math.sin(relativeFrame / 20) * 15; // Gentler sway
  const horizontalPath = interpolate(
    relativeFrame,
    [0, duration],
    [0, xOffset],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const x = width / 2 + horizontalPath + windEffect;

  // Scaling effect using spring for a "pop"
  const scale = spring({
    frame: relativeFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 90,
    },
  });

  if (relativeFrame < 0 || relativeFrame > duration) {
    return null;
  }

  // Extract first name only for cleaner UI
  const firstName = name.split(" ")[0];

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        color: "#D4AF37",
        fontSize: "0.85rem",
        fontWeight: "700",
        textAlign: "center",
        textShadow: "0 0 12px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.1)",
        whiteSpace: "nowrap",
        fontFamily: "'Outfit', 'Inter', sans-serif",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         <span style={{ filter: "drop-shadow(0 0 5px rgba(212,175,55,0.3))" }}>{firstName}</span>
         <span style={{ fontSize: "0.6rem", opacity: 0.6, marginTop: 2 }}>✦</span>
      </div>
    </div>
  );
};

export default FloatingName;
