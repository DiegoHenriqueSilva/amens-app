import React from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Using a recognized public topojson for Brazil states
const geoUrl = "https://raw.githubusercontent.com/luizbills/brasil-topojson/master/topojson/brm.json";

interface BrazilMapProps {
  onStateClick: (stateUf: string) => void;
  selectedState?: string | null;
}

const BrazilMap: React.FC<BrazilMapProps> = ({ onStateClick, selectedState }) => {
  return (
    <Card className="p-2 sm:p-4 border-primary/20 bg-background/50 backdrop-blur-sm rounded-[2rem] overflow-hidden relative soft-shadow">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="w-full relative z-10 flex justify-center">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 750, center: [-54, -15] }}
          className="w-full max-w-[450px] aspect-square"
        >
          <TooltipProvider delayDuration={50}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateUf = geo.id as string; // Usually "SP", "RJ", etc.
                  const isSelected = selectedState === stateUf;
                  
                  return (
                    <Tooltip key={geo.rsmKey}>
                      <TooltipTrigger asChild>
                        <Geography
                          geography={geo}
                          onClick={() => onStateClick(stateUf)}
                          style={{
                            default: {
                              fill: isSelected ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.15)",
                              stroke: isSelected ? "hsl(var(--primary-foreground))" : "hsl(var(--primary) / 0.5)",
                              strokeWidth: isSelected ? 1.5 : 0.75,
                              outline: "none",
                              transition: "all 250ms"
                            },
                            hover: {
                              fill: "hsl(var(--primary) / 0.8)",
                              stroke: "hsl(var(--primary))",
                              strokeWidth: 1.5,
                              outline: "none",
                              cursor: "pointer",
                              transition: "all 250ms"
                            },
                            pressed: {
                              fill: "hsl(var(--primary))",
                              stroke: "hsl(var(--background))",
                              strokeWidth: 1,
                              outline: "none",
                            },
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="bg-primary text-primary-foreground font-bold border-none">
                        <p>{stateUf}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              }
            </Geographies>
          </TooltipProvider>
        </ComposableMap>
      </div>
    </Card>
  );
};

export default BrazilMap;
