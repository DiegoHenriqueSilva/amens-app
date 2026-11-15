import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { geoMercator } from 'd3-geo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, RotateCcw, Sparkles } from 'lucide-react';
import { type ActiveCityMarker } from '@/data/brazil-city-coords';

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

interface BrazilMapProps {
  onStateClick: (stateUf: string) => void;
  onCityClick?: (city: string, stateUf: string) => void;
  selectedState?: string | null;
  selectedCity?: string | null;
  activeCities?: ActiveCityMarker[];
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

const BrazilMap: React.FC<BrazilMapProps> = ({
  onStateClick,
  onCityClick,
  selectedState,
  selectedCity,
  activeCities = [],
  isLoading = false,
  hasError = false,
  onRetry,
}) => {
  const [hoveredCity, setHoveredCity] = useState<ActiveCityMarker | null>(null);
  const [scale, setScale] = useState(880);
  const [centerOffset, setCenterOffset] = useState<[number, number]>([-54, -14]);

  // An empty result must stay empty; never substitute sample cities or member counts.
  const displayCities = useMemo(() => activeCities.filter(city => city.count > 0), [activeCities]);

  // Exact Projection mathematically aligned with the SVG viewBox (800x600)
  const projection = useMemo(() => {
    return geoMercator()
      .scale(scale)
      .center(centerOffset)
      .translate([400, 300]);
  }, [scale, centerOffset]);

  // Calculate pixel coordinates [x, y] for all active cities
  const projectedBeacons = useMemo(() => {
    return displayCities.map((cityMarker) => {
      const coords = projection(cityMarker.coordinates);
      return {
        ...cityMarker,
        x: coords ? coords[0] : -9999,
        y: coords ? coords[1] : -9999,
      };
    }).filter(b => b.x > 0 && b.x < 800 && b.y > 0 && b.y < 600);
  }, [displayCities, projection]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.35, 2400));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.35, 880));
  };

  const handleResetZoom = () => {
    setScale(880);
    setCenterOffset([-54, -14]);
  };

  // Currently focused city (either hovered or selected)
  const activeFocusCity = displayCities.find(city => hoveredCity
    ? city.city === hoveredCity.city && city.state === hoveredCity.state
    : city.city.toLowerCase() === selectedCity?.toLowerCase() && city.state === selectedState);

  return (
    <Card className="p-2 sm:p-4 border-primary/20 bg-card/85 backdrop-blur-md rounded-[2.5rem] overflow-hidden relative soft-shadow border-2 shadow-xl">
      
      {/* Background Soft Divine Ambient Glows */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Zoom Controls */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1.5 bg-background/90 backdrop-blur-md p-1 rounded-2xl border border-primary/20 shadow-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 2400}
          className="w-8 h-8 rounded-xl hover:bg-primary/10 text-primary disabled:opacity-30"
          title="Aproximar Zoom"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 880}
          className="w-8 h-8 rounded-xl hover:bg-primary/10 text-primary disabled:opacity-30"
          title="Afastar Zoom"
        >
          <Minus className="w-4 h-4" />
        </Button>
        {scale > 880 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetZoom}
            className="w-8 h-8 rounded-xl hover:bg-primary/10 text-amber-700"
            title="Redefinir Visão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Prominent High-Contrast Floating Header Badge for Focused City */}
      {activeFocusCity && (
        <div className="absolute top-4 left-4 z-30 bg-[#2b1400]/95 backdrop-blur-md text-amber-100 border-2 border-amber-400 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 pointer-events-none animate-in fade-in zoom-in-95">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-400 ring-4 ring-amber-400/40 animate-pulse shrink-0" />
          <div>
            <p className="font-extrabold text-sm text-white leading-tight">
              {activeFocusCity.city}, {activeFocusCity.state}
            </p>
            <p className="text-xs text-amber-300 font-bold leading-tight mt-0.5">
              {activeFocusCity.count} {activeFocusCity.count === 1 ? 'membro público na comunidade' : 'membros públicos na comunidade'}
            </p>
          </div>
        </div>
      )}

      {/* Map Canvas with Guaranteed SVG Beacon Overlay */}
      <div className="w-full relative z-10 flex justify-center min-h-[360px] sm:min-h-[440px] select-none touch-pan-y">
        
        {/* React Simple Maps Base Layer */}
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: scale,
            center: centerOffset
          }}
          className="w-full h-full"
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name || "Estado";
                const stateUf = geo.properties.sigla || geo.id || stateName;
                const isSelected = selectedState === stateUf;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onStateClick(stateUf)}
                    style={{
                      default: {
                        fill: isSelected ? "#e6c358" : "#fbf8f0",
                        stroke: "#c5a059",
                        strokeWidth: isSelected ? 1.8 : 0.8,
                        outline: "none",
                        transition: "fill 250ms ease, stroke 250ms ease"
                      },
                      hover: {
                        fill: "#ebd380",
                        stroke: "#b8860b",
                        strokeWidth: 1.5,
                        opacity: 0.95,
                        outline: "none",
                        cursor: "pointer",
                        transition: "all 150ms ease"
                      },
                      pressed: {
                        fill: "#c59f27",
                        stroke: "#8b6508",
                        strokeWidth: 1.5,
                        outline: "none",
                      },
                    }}
                  >
                    <title>{`${stateName} (${stateUf}) - Toque para filtrar estado`}</title>
                  </Geography>
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* SVG Beacon Overlay with Stable Non-Jittering Hit Targets */}
        <svg
          viewBox="0 0 800 600"
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          aria-label="Cidades com membros públicos"
        >
          <defs>
            {/* Pulsing Divine Halo Filter */}
            <filter id="divineGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial Gradients */}
            <radialGradient id="beaconGlowYellow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
              <stop offset="30%" stopColor="#fef08a" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="beaconCoreGold" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fef08a" />
              <stop offset="80%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>
          </defs>

          {/* Render each glowing city point */}
          {projectedBeacons.map((beacon, i) => {
            const isSelected = selectedCity?.toLowerCase() === beacon.city.toLowerCase() && selectedState === beacon.state;
            const isHovered = hoveredCity?.city.toLowerCase() === beacon.city.toLowerCase() && hoveredCity?.state === beacon.state;
            const showLabel = isHovered || isSelected;

            // Stable Base size scale
            const baseRadius = beacon.count >= 30 ? 6.5 : beacon.count >= 15 ? 5.5 : 4.5;
            const outerGlowRadius = baseRadius * 3.8;
            
            // Dynamic width for large legible tooltip tag
            const labelText = `${beacon.city} (${beacon.count})`;
            const labelWidth = Math.max(105, labelText.length * 9.5 + 28);
            const labelHeight = 28;

            return (
              <g
                key={`${beacon.city}-${beacon.state}-${i}`}
                transform={`translate(${beacon.x}, ${beacon.y})`}
                className="pointer-events-auto cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${beacon.city}, ${beacon.state}: ${beacon.count} ${beacon.count === 1 ? 'membro público' : 'membros públicos'}`}
                onClick={() => {
                  if (onCityClick) {
                    onCityClick(beacon.city, beacon.state);
                  }
                }}
                onMouseEnter={() => setHoveredCity(beacon)}
                onMouseLeave={() => setHoveredCity(null)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onCityClick?.(beacon.city, beacon.state);
                  }
                }}
              >
                {/* 1. Large Outer Radiant Wave (Pulsing Glow - pointer-events: none to avoid flicker) */}
                <circle
                  r={outerGlowRadius}
                  fill="url(#beaconGlowYellow)"
                  opacity={showLabel ? 0.95 : 0.75}
                  filter="url(#divineGlowFilter)"
                  pointerEvents="none"
                >
                  <animate
                    attributeName="r"
                    values={`${baseRadius * 2};${outerGlowRadius};${baseRadius * 2}`}
                    dur="2.8s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.85;0.35;0.85"
                    dur="2.8s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* 2. Middle Halo (pointer-events: none) */}
                <circle
                  r={baseRadius * 2}
                  fill="#f59e0b"
                  opacity={0.45}
                  pointerEvents="none"
                />

                {/* 3. Core Spherical Golden Bead */}
                <circle
                  r={showLabel ? baseRadius * 1.35 : baseRadius}
                  fill="url(#beaconCoreGold)"
                  stroke={showLabel ? "#ffffff" : "#78350f"}
                  strokeWidth={showLabel ? 2 : 1.2}
                  className="drop-shadow-md transition-all duration-200"
                  pointerEvents="none"
                />

                {/* 4. Center Specular White Reflection Glint */}
                <circle
                  cx={-baseRadius * 0.3}
                  cy={-baseRadius * 0.3}
                  r={baseRadius * 0.35}
                  fill="#ffffff"
                  opacity={0.95}
                  pointerEvents="none"
                />

                {/* 5. Invisible Solid Hit Target Circle (Eliminates Jitter/Flicker completely) */}
                <circle
                  r={22}
                  fill="transparent"
                  pointerEvents="all"
                />

                {/* 6. Prominent, Large, Extra-Legible Tooltip Tag */}
                {showLabel && (
                  <g 
                    transform={`translate(0, -${baseRadius + 22})`} 
                    pointerEvents="none"
                    className="animate-in fade-in zoom-in-95"
                  >
                    {/* Shadow Backing */}
                    <rect
                      x={-labelWidth / 2}
                      y={-labelHeight / 2}
                      width={labelWidth}
                      height={labelHeight}
                      rx={labelHeight / 2}
                      fill="#1a0a00"
                      stroke="#fbbf24"
                      strokeWidth="2"
                      opacity="0.98"
                    />

                    {/* Arrow Pointer Down */}
                    <polygon
                      points="-5,14 5,14 0,20"
                      fill="#1a0a00"
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                    />

                    {/* Extra Bold, Crystal-Clear City Name & Count */}
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="800"
                      letterSpacing="0.3px"
                      className="select-none font-sans font-extrabold drop-shadow"
                    >
                      {beacon.city} ({beacon.count})
                    </text>
                  </g>
                )}

                <title>{`${beacon.city}, ${beacon.state} • ${beacon.count} membros públicos`}</title>
              </g>
            );
          })}
        </svg>

      </div>

      {/* Mobile-Friendly Legend & Status Bar */}
      <div className="mt-2 pt-2 border-t border-primary/10 flex flex-wrap items-center justify-between gap-2 px-2 text-[10px] sm:text-xs text-muted-foreground" role="status" aria-live="polite">
        <div className="flex items-center gap-2">
          {!isLoading && !hasError && displayCities.length > 0 && <div className="w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-400/40 animate-pulse shadow-sm" />}
          <span className="font-semibold text-foreground/90">
            {isLoading ? 'Carregando comunidades…'
              : hasError ? 'Não foi possível carregar as comunidades.'
              : displayCities.length === 0 ? 'Ainda não há membros públicos com cidade cadastrada.'
              : `Pontos de luz (${displayCities.length} ${displayCities.length === 1 ? 'cidade' : 'cidades'})`}
          </span>
        </div>
        {hasError && onRetry && <Button variant="ghost" size="sm" onClick={onRetry}>Tentar novamente</Button>}
        {!isLoading && !hasError && displayCities.length > 0 && <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span>Passe o mouse ou toque para ver os fiéis</span>
        </div>}
      </div>

    </Card>
  );
};

export default BrazilMap;
