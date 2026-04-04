import React, { useMemo } from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  AbsoluteFill,
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
  const duration = 120; // 4 seconds at 30fps

  // Opacity: Fade in and out
  const opacity = interpolate(
    relativeFrame,
    [0, 20, duration - 20, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Vertical Movement: From base to top
  const y = interpolate(
    relativeFrame,
    [0, duration],
    [height - 50, -100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Horizontal Movement (Wind Effect): Side dispersal + Sinusoidal wave
  // Each name gets a unique seeded random for its dispersal direction
  const xOffset = useMemo(() => (Math.random() - 0.5) * 300, []); // Disperse up to 150px left/right
  
  const windEffect = Math.sin(relativeFrame / 15) * 30; // Sinusoidal sway
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
      damping: 12,
      stiffness: 100,
    },
  });

  if (relativeFrame < 0 || relativeFrame > duration) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        color: "rgba(212, 175, 55, 0.9)",
        fontSize: "1.2rem",
        fontWeight: "600",
        textAlign: "center",
        textShadow: "0 2px 4px rgba(0,0,0,0.1), 0 0 10px rgba(212,175,55,0.3)",
        whiteSpace: "nowrap",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {name}
      <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: -4 }}>🙏</div>
    </div>
  );
};

export default FloatingName;
