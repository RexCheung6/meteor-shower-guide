import { useTranslation } from "react-i18next";
import type { HourlyPoint } from "../types";

export interface DarkWindow {
  start: Date;
  end: Date;
}

export default function CloudChart({
  points,
  darkWindows,
  locale
}: {
  points: HourlyPoint[];
  darkWindows: DarkWindow[];
  locale: "zh" | "en";
}) {
  const { t } = useTranslation();
  const W = 760;
  const H = 260;
  const PAD = { l: 42, r: 12, t: 14, b: 26 };
  if (points.length === 0) return null;
  const startMs = new Date(points[0].time).getTime();
  const endMs = new Date(points[points.length - 1].time).getTime() + 3600000;
  const x = (ms: number) => PAD.l + ((ms - startMs) / Math.max(1, endMs - startMs)) * (W - PAD.l - PAD.r);
  const temps = points.map((p) => p.temperature);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const yCloud = (c: number) => PAD.t + (1 - c / 100) * (H - PAD.t - PAD.b);
  const yTemp = (tp: number) => PAD.t + ((maxT - tp) / Math.max(1, maxT - minT)) * (H - PAD.t - PAD.b);
  const maxPrecip = Math.max(0.5, ...points.map((p) => p.precipitation));
  const cloudPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(new Date(p.time).getTime()).toFixed(1)},${yCloud(p.cloudCover).toFixed(1)}`)
    .join(" ");
  const cloudArea = `${cloudPath} L${x(endMs).toFixed(1)},${(H - PAD.b).toFixed(1)} L${x(startMs).toFixed(1)},${(H - PAD.b).toFixed(1)} Z`;
  const tempPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(new Date(p.time).getTime()).toFixed(1)},${yTemp(p.temperature).toFixed(1)}`)
    .join(" ");
  const hourFmt = (ms: number) =>
    new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", hour12: false }).format(ms);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={t("weather.chartTitle")}>
      {darkWindows
        .filter((w) => w.end.getTime() > startMs && w.start.getTime() < endMs)
        .map((w, i) => (
          <rect
            key={i}
            x={x(Math.max(startMs, w.start.getTime()))}
            y={PAD.t}
            width={Math.max(0, x(Math.min(endMs, w.end.getTime())) - x(Math.max(startMs, w.start.getTime())))}
            height={H - PAD.t - PAD.b}
            className="dark-shade"
          >
            <title>{t("weather.darkShade")}</title>
          </rect>
        ))}
      {points.map((p, i) => {
        const ms = new Date(p.time).getTime();
        return (
          <g key={p.time}>
            {i % 3 === 0 && (
              <text x={x(ms)} y={H - 8} textAnchor="middle" className="axis-label">
                {hourFmt(ms)}
              </text>
            )}
            <rect x={x(ms) - 2.5} y={H - PAD.b - (p.precipitation / maxPrecip) * 40} width="5" height={(p.precipitation / maxPrecip) * 40} className="precip-bar">
              <title>{`${t("weather.precipMm")}: ${p.precipitation} mm`}</title>
            </rect>
            <circle cx={x(ms)} cy={yCloud(p.cloudCover)} r="2" className="cloud-dot">
              <title>{`${hourFmt(ms)} ${t("weather.cloud")}: ${p.cloudCover}% · ${t("weather.temp")}: ${p.temperature.toFixed(1)}°C · ${t("weather.visibilityKm")}: ${p.visibilityKm.toFixed(0)} km`}</title>
            </circle>
          </g>
        );
      })}
      <path d={cloudArea} className="cloud-area" />
      <path d={cloudPath} className="cloud-line" fill="none" />
      <path d={tempPath} className="temp-line" fill="none" />
      <text x={PAD.l + 4} y={PAD.t + 8} className="chart-label">
        {t("weather.cloud")} (%)
      </text>
      <text x={W - PAD.r} y={PAD.t + 8} textAnchor="end" className="chart-label">
        {t("weather.temp")} (°C)
      </text>
    </svg>
  );
}
