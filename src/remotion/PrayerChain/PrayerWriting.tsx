import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface PhraseContribution {
  index: number;
  text: string;
  contributorName: string;
  contributorCity: string;
}

interface PrayerWritingProps {
  phrases?: PhraseContribution[]; // Made optional
  text?: string;
  author?: string;
  location?: string;
  isEternalFlow?: boolean;
}

const PrayerWriting: React.FC<PrayerWritingProps> = ({ 
  phrases = [], 
  text, 
  author, 
  location, 
  isEternalFlow 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // If phrases array is provided, use it. Otherwise fallback to text (for older/simpler implementations)
  const displayPhrases = phrases && phrases.length > 0 
    ? phrases 
    : (text ? [{ index: 0, text, contributorName: author || "", contributorCity: location || "" }] : []);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div className="w-full max-w-4xl space-y-8">
        {displayPhrases.map((phrase, i) => {
          const isLatest = i === displayPhrases.length - 1;
          
          const spr = spring({
            frame: isLatest ? frame : 100,
            fps,
            config: {
              stiffness: 60,
              damping: 10,
            },
          });

          const opacity = interpolate(spr, [0, 1], [0, 1]);
          const scale = interpolate(spr, [0, 1], [0.95, 1]);
          const blur = interpolate(spr, [0, 1], [10, 0]);

          return (
            <div
              key={`${phrase.index}-${i}`}
              style={{
                opacity: isLatest ? opacity : 0.4,
                transform: `scale(${isLatest ? scale : 0.95})`,
                filter: isLatest ? `blur(${blur}px)` : 'none',
                textAlign: "center",
                transition: 'opacity 1s ease-in-out',
              }}
              className="relative px-6"
            >
              <h2 
                className="text-6xl md:text-8xl font-serif italic font-medium leading-[1.2] mb-4"
                style={{
                  background: "linear-gradient(to bottom, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                  letterSpacing: '-0.02em',
                }}
              >
                {phrase.text}
              </h2>
              
              <div 
                className="text-[12px] text-black font-semibold uppercase tracking-[0.3em] opacity-30 mt-4"
              >
                {phrase.contributorName} {phrase.contributorCity ? `• ${phrase.contributorCity}` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default PrayerWriting;
