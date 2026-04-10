import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface PhraseContribution {
  index: number;
  text: string;
  contributorName: string;
  contributorCity: string;
}

interface PrayerWritingProps {
  phrases: PhraseContribution[];
}

const PrayerWriting: React.FC<PrayerWritingProps> = ({ phrases }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Background Parchment Effect (handled via CSS in the page, but can add texture here) */}
      <div className="w-full max-w-2xl space-y-8">
        {phrases.map((phrase, i) => {
          // Animation for each phrase
          const phraseDelay = i * 5;
          const spr = spring({
            frame: frame - phraseDelay,
            fps,
            config: {
              stiffness: 100,
            },
          });

          const opacity = interpolate(spr, [0, 1], [0, 1]);
          const translateY = interpolate(spr, [0, 1], [20, 0]);

          return (
            <div
              key={`${phrase.index}-${i}`}
              style={{
                opacity,
                transform: `translateY(${translateY}px)`,
                textAlign: "center",
              }}
              className="relative"
            >
              <h2 
                className="text-2xl md:text-3xl font-serif font-bold text-glow-gold"
                style={{
                  background: "linear-gradient(to bottom, #D4AF37, #F9E27A, #D4AF37)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {phrase.text}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-1 opacity-60 uppercase tracking-[0.2em] font-medium">
                {phrase.contributorName} • {phrase.contributorCity}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default PrayerWriting;
