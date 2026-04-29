import React from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Using a highly reliable GeoJSON for Brazil states to ensure rendering
const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

interface BrazilMapProps {
  onStateClick: (stateUf: string) => void;
  selectedState?: string | null;
}

const BrazilMap: React.FC<BrazilMapProps> = ({ onStateClick, selectedState }) => {
  return (
    <Card className="p-2 sm:p-4 border-primary/10 bg-white/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden relative soft-shadow border-2">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="w-full relative z-10 flex justify-center min-h-[380px]">
        <TooltipProvider delayDuration={50}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ 
              scale: 900, 
              center: [-54, -14] 
            }}
            className="w-full h-full"
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  // In this GeoJSON, properties usually contain 'sigla' or 'name'
                  // Adjusting name extraction based on common geojson properties
                  const stateName = geo.properties.name || "Estado";
                  const stateUf = geo.properties.sigla || geo.id || stateName;
                  const isSelected = selectedState === stateUf;
                  
                  return (
                    <Tooltip key={geo.rsmKey}>
                      <TooltipTrigger asChild>
                        <Geography
                          geography={geo}
                          onClick={() => onStateClick(stateUf)}
                          style={{
                            default: {
                              fill: isSelected ? "#c9a227" : "#fbf7ef",
                              stroke: "#c9a227",
                              strokeWidth: isSelected ? 1.5 : 0.8,
                              outline: "none",
                              transition: "all 300ms ease"
                            },
                            hover: {
                              fill: "#c9a227",
                              stroke: "#FFFFFF",
                              strokeWidth: 1.5,
                              opacity: 0.9,
                              outline: "none",
                              cursor: "pointer",
                              transition: "all 300ms ease"
                            },
                            pressed: {
                              fill: "#b8860b",
                              stroke: "#FFFFFF",
                              strokeWidth: 1,
                              outline: "none",
                            },
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="bg-primary text-primary-foreground font-bold border-none rounded-xl px-4 py-2 shadow-xl">
                        <p className="text-xs font-bold uppercase tracking-widest">{stateName}</p>
                        <p className="text-[10px] opacity-70 font-medium">Clique para ver paróquias</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </TooltipProvider>
      </div>
      
      {/* Visual background element */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />
    </Card>
  );
};

export default BrazilMap;
