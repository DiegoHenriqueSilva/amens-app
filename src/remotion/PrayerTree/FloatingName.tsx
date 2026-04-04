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

  // Animação começa no frame 'delay'
  const relativeFrame = frame - delay;

  // Vertical Stability + Gentle Sway (Flowing in a channel)
  const yBase = useMemo(() => (height * 0.2) + (Math.random() * height * 0.55), [height]);
  const verticalSway = Math.sin(relativeFrame / 25) * 12;
  const y = yBase + verticalSway;

  // Horizontal Movement (Left to Right)
  const duration = 200; // Slower for a more meditative feel
  const x = interpolate(
    relativeFrame,
    [0, duration],
    [-80, width + 80],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Opacity: Fade in at 10% and out at 90% of duration
  const opacity = interpolate(
    relativeFrame,
    [0, 20, duration - 30, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scaling effect for a gentle entrance
  const scale = spring({
    frame: relativeFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 80,
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
