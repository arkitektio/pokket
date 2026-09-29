import type { PointRow, VisitRow } from '@/lib/timeline/db';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Camera, GeoJSONSource, Layer, Map, type LngLatBounds } from '@maplibre/maplibre-react-native';
import * as React from 'react';
import { View } from 'react-native';

/**
 * A day's route and stays, drawn from the device's own data. The only
 * network traffic is for the tiles of `styleUrl` — the server the user
 * chose in Settings.
 */
export function TimelineMap({
  styleUrl,
  points,
  visits,
  height = 280,
}: {
  styleUrl: string;
  points: readonly PointRow[];
  visits: readonly VisitRow[];
  height?: number;
}) {
  const colors = useThemeColors();

  const route = React.useMemo<GeoJSON.Feature>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: points.map((p) => [p.lon, p.lat]) },
    }),
    [points],
  );

  const stays = React.useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: visits.map((v) => ({
        type: 'Feature',
        properties: { id: v.id },
        geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
      })),
    }),
    [visits],
  );

  /** The newest fix, so even one "Record now" shows up before it is a visit. */
  const last = React.useMemo<GeoJSON.Feature | null>(() => {
    const p = points[points.length - 1];
    return p ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } } : null;
  }, [points]);

  const bounds = React.useMemo<LngLatBounds | null>(() => {
    const coords = [...points.map((p) => [p.lon, p.lat]), ...visits.map((v) => [v.lon, v.lat])];
    if (coords.length === 0) return null;
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const pad = 0.002;
    return [Math.min(...lons) - pad, Math.min(...lats) - pad, Math.max(...lons) + pad, Math.max(...lats) + pad];
  }, [points, visits]);

  if (!bounds) return null;

  return (
    <View style={{ height }} className="overflow-hidden rounded-xl border border-border">
      <Map mapStyle={styleUrl} style={{ flex: 1 }} logo={false} attribution>
        <Camera bounds={bounds} padding={{ top: 24, right: 24, bottom: 24, left: 24 }} duration={0} />
        {points.length > 1 ? (
          <GeoJSONSource id="timeline-route" data={route}>
            <Layer
              id="timeline-route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': colors.primary, 'line-width': 4, 'line-opacity': 0.85 }}
            />
          </GeoJSONSource>
        ) : null}
        <GeoJSONSource id="timeline-stays" data={stays}>
          <Layer
            id="timeline-stays-circle"
            type="circle"
            paint={{
              'circle-radius': 7,
              'circle-color': colors.background,
              'circle-stroke-color': colors.primary,
              'circle-stroke-width': 3,
            }}
          />
        </GeoJSONSource>
        {last ? (
          <GeoJSONSource id="timeline-last" data={last}>
            <Layer
              id="timeline-last-dot"
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': colors.primary,
                'circle-stroke-color': colors.background,
                'circle-stroke-width': 2,
              }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>
    </View>
  );
}
