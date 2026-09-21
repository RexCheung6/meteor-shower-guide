import { useMemo } from "react";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer } from "react-leaflet";
import { useTranslation } from "react-i18next";
import "leaflet/dist/leaflet.css";
import type { DarkSite, Shower } from "../types";
import { radiantAltitudeAt } from "../lib/astro";
import { localizedName, type Locale } from "../lib/locale";
import type { GeoJsonObject } from "geojson";

const GIBS_URL =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png";

interface GridFeature {
  type: "Feature";
  properties: { alt: number };
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

const ALT_BUCKETS = [
  { min: -999, max: 0, color: "#4b4f5c", labelKey: "below" },
  { min: 0, max: 10, color: "#5f6b7a", labelKey: "horizon" },
  { min: 10, max: 25, color: "#4a6fa5", labelKey: "low" },
  { min: 25, max: 45, color: "#38a169", labelKey: "medium" },
  { min: 45, max: 65, color: "#e8a33d", labelKey: "high" },
  { min: 65, max: 999, color: "#e05b4d", labelKey: "veryHigh" }
];

function buildGrid(shower: Shower, time: Date): GridFeature[] {
  const features: GridFeature[] = [];
  const latStep = 5;
  const lngStep = 7.5;
  for (let lat = -70; lat < 75; lat += latStep) {
    for (let lng = -180; lng < 180; lng += lngStep) {
      const alt = radiantAltitudeAt(time, lat + latStep / 2, lng + lngStep / 2, shower.radiant.ra, shower.radiant.dec);
      features.push({
        type: "Feature",
        properties: { alt: Math.round(alt * 10) / 10 },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [lng, lat],
              [lng + lngStep, lat],
              [lng + lngStep, lat + latStep],
              [lng, lat + latStep],
              [lng, lat]
            ]
          ]
        }
      });
    }
  }
  return features;
}

function bucketFor(alt: number): (typeof ALT_BUCKETS)[number] {
  return ALT_BUCKETS.find((b) => alt >= b.min && alt < b.max) ?? ALT_BUCKETS[0];
}

export default function MeteorMap({
  shower,
  time,
  sites,
  focusSiteId,
  showLightPollution,
  locale
}: {
  shower: Shower;
  time: Date;
  sites: DarkSite[];
  focusSiteId?: string | null;
  showLightPollution: boolean;
  locale: Locale;
}) {
  const { t } = useTranslation();
  const grid = useMemo(() => buildGrid(shower, time), [shower, time]);
  return (
    <div className="map-wrap">
      <MapContainer center={[25, 60]} zoom={2} minZoom={2} maxZoom={9} scrollWheelZoom={false} worldCopyJump className="meteor-map">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {showLightPollution && <TileLayer url={GIBS_URL} attribution="NASA GIBS" opacity={0.85} />}
        <GeoJSON
          key={time.getTime()}
          data={{ type: "FeatureCollection", features: grid } as GeoJsonObject}
          style={(feature) => {
            const alt = (feature as GridFeature).properties.alt;
            const bucket = bucketFor(alt);
            return { color: bucket.color, weight: 0.4, fillColor: bucket.color, fillOpacity: 0.5 };
          }}
        />
        {sites.map((site) => (
          <CircleMarker
            key={site.id}
            center={[site.lat, site.lng]}
            radius={site.id === focusSiteId ? 9 : 6}
            pathOptions={{
              color: site.id === focusSiteId ? "#ff5b5b" : "#ffd166",
              weight: site.id === focusSiteId ? 2 : 1,
              fillColor: site.id === focusSiteId ? "#ff5b5b" : "#ffd166",
              fillOpacity: 0.9
            }}
          >
            <Popup>
              <strong>{localizedName(site.names, locale)}</strong>
              <br />
              {t("map.site")}: Bortle {site.bortleClass} · {localizedName(site.region, locale)}
              <br />
              {localizedName(site.tips, locale)}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="map-legend">
        <div className="map-legend-title">{t("map.legendTitle")}</div>
        {ALT_BUCKETS.map((b) => (
          <div key={b.labelKey} className="legend-row">
            <span className="legend-swatch" style={{ background: b.color }} />
            <span>{t(`map.${b.labelKey}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
