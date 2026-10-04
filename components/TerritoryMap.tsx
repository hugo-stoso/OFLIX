"use client";

import { useMemo, useState } from "react";
import type { MunicipalityAggregate, TerritoryGeometry, TerritoryMetric } from "@/lib/territory";
import { territoryMetricLabel } from "@/lib/territory";

type Position = [number, number];

type TerritoryMapProps = {
  geometry: TerritoryGeometry;
  municipalities: MunicipalityAggregate[];
  metric: TerritoryMetric;
  category?: string;
  selectedMunicipality: string | null;
  onSelect: (municipality: string) => void;
};

function ringsForFeature(feature: TerritoryGeometry["features"][number]) {
  if (feature.geometry.type === "Polygon") return feature.geometry.coordinates as Position[][];
  return (feature.geometry.coordinates as Position[][][]).flat();
}

function valueForMunicipality(municipality: MunicipalityAggregate | undefined, metric: TerritoryMetric, category?: string) {
  if (!municipality) return 0;
  if (!category) {
    if (metric === "employment") return municipality.formal;
    return municipality[metric];
  }
  const categories = municipality.categories.filter((item) => item.category === category);
  if (metric === "employment") return categories.filter((item) => item.front === "formal").reduce((total, item) => total + item.total, 0);
  if (metric === "services") return categories.filter((item) => item.front === "service").reduce((total, item) => total + item.total, 0);
  if (metric === "volunteer") return categories.filter((item) => item.front === "volunteer").reduce((total, item) => total + item.total, 0);
  if (metric === "interactions") return categories.reduce((total, item) => total + item.interactions, 0);
  return categories.reduce((total, item) => total + item.total, 0);
}

function formatPath(rings: Position[][], project: (position: Position) => Position) {
  return rings.map((ring) => ring.map((position, index) => `${index === 0 ? "M" : "L"} ${project(position)[0].toFixed(2)} ${project(position)[1].toFixed(2)}`).join(" ") + " Z").join(" ");
}

export function TerritoryMap({ geometry, municipalities, metric, category, selectedMunicipality, onSelect }: TerritoryMapProps) {
  const [hoveredMunicipality, setHoveredMunicipality] = useState<string | null>(null);
  const byCode = useMemo(() => new Map(municipalities.filter((item) => item.ibgeCode).map((item) => [item.ibgeCode, item])), [municipalities]);
  const byName = useMemo(() => new Map(municipalities.map((item) => [item.municipality, item])), [municipalities]);
  const projection = useMemo(() => {
    const positions = geometry.features.flatMap((feature) => ringsForFeature(feature).flat());
    const longitudes = positions.map(([longitude]) => longitude);
    const latitudes = positions.map(([, latitude]) => latitude);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const width = 1000;
    const height = 900;
    const padding = 24;
    return {
      width,
      height,
      project: ([longitude, latitude]: Position): Position => [padding + ((longitude - minLongitude) / (maxLongitude - minLongitude)) * (width - padding * 2), padding + ((maxLatitude - latitude) / (maxLatitude - minLatitude)) * (height - padding * 2)],
    };
  }, [geometry]);
  const values = geometry.features.map((feature) => {
    const municipality = byCode.get(feature.properties.ibgeCode) ?? byName.get(feature.properties.municipality);
    return { feature, municipality, value: valueForMunicipality(municipality, metric, category) };
  });
  const maxValue = Math.max(1, ...values.map((item) => item.value));
  const hovered = values.find((item) => item.feature.properties.municipality === hoveredMunicipality);

  function fillFor(value: number) {
    if (value === 0) return "#edf3f6";
    const ratio = value / maxValue;
    if (ratio <= 0.33) return "#c7dce7";
    if (ratio <= 0.66) return "#76aec5";
    return "#1d5b8f";
  }

  return <div className="territory-map-wrap">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="eyebrow">Mapa coroplético municipal</p>
        <p className="mt-1 text-sm text-[#637688]">{geometry.features.length} municípios · métrica: <span className="font-bold text-navy">{territoryMetricLabel(metric)}</span></p>
      </div>
      <span className="inline-flex items-center rounded-full border border-line bg-[#f8fbfd] px-3 py-2 text-xs font-bold text-[#637688]">Malha IBGE · 2024</span>
    </div>
    <div className="relative rounded-2xl border border-line bg-[#f8fbfd] p-2 sm:p-4">
      <svg className="territory-map w-full" viewBox={`0 0 ${projection.width} ${projection.height}`} role="img" aria-label={`Mapa territorial de Sergipe por ${territoryMetricLabel(metric)}`} preserveAspectRatio="xMidYMid meet">
        <title>Municípios de Sergipe</title>
        {values.map(({ feature, value }) => {
          const name = feature.properties.municipality;
          const isSelected = name === selectedMunicipality;
          const label = value ? `${name}, ${territoryMetricLabel(metric)}: ${value}` : `${name}, sem registros nesta demonstração`;
          return <path
            key={feature.properties.ibgeCode ?? name}
            className="territory-map-path"
            d={formatPath(ringsForFeature(feature), projection.project)}
            fill={fillFor(value)}
            stroke={isSelected ? "#10243e" : "#ffffff"}
            strokeWidth={isSelected ? 3.5 : 1.25}
            strokeLinejoin="round"
            fillRule="evenodd"
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={isSelected}
            onClick={() => onSelect(name)}
            onMouseEnter={() => setHoveredMunicipality(name)}
            onMouseLeave={() => setHoveredMunicipality(null)}
            onFocus={() => setHoveredMunicipality(name)}
            onBlur={() => setHoveredMunicipality(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(name);
              }
            }}
          ><title>{label}</title></path>;
        })}
      </svg>
      {hovered ? <div className="pointer-events-none absolute left-5 top-5 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-soft" aria-live="polite"><strong className="block text-navy">{hovered.feature.properties.municipality}</strong><span className="text-[#637688]">{territoryMetricLabel(metric)}: {hovered.value}</span></div> : null}
    </div>
    <p className="mt-3 text-xs leading-5 text-[#718291]">Clique ou use Tab para escolher um município. Áreas sem registros permanecem neutras e não representam ausência de atividade econômica real.</p>
  </div>;
}
