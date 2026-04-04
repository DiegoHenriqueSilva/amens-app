import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import TreeSVG from "./TreeSVG";
import FloatingName from "./FloatingName";

interface Prayer {
  name: string;
  timestamp: string;
}

interface PrayerTreeProps {
  prayers: Prayer[];
  level?: number;
}

const PrayerTree: React.FC<PrayerTreeProps> = ({ prayers, level = 1 }) => {
  const { width, height } = useVideoConfig();

  // Sort prayers by timestamp (optional, but good for consistency)
  const sortedPrayers = [...prayers].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Tree Visualization */}
      <div style={{ position: "relative", zIndex: 1, pointerEvents: "none" }}>
        <TreeSVG level={level} />
      </div>

      {/* Floating Names of Intercessors */}
      {sortedPrayers.map((prayer, index) => (
        <FloatingName
          key={`${prayer.name}-${index}`}
          name={prayer.name}
          delay={index * 35} // Slightly more spacing
        />
      ))}
    </AbsoluteFill>
  );
};

export default PrayerTree;
