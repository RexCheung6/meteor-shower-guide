import { useTranslation } from "react-i18next";

export interface RatePoint {
  time: Date;
  alt: number;
  rate: number;
}

function fmtHour(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

export default function RateChart({ points }: { points: RatePoint[] }) {
  const { t } = useTranslation();
  const W = 720;
  const H = 230;
  const PAD = { l: 38, r: 10, t: 12, b: 24 };
  if (points.length === 0) return null;
  const maxRate = Math.max(2, ...points.map((p) => p.rate));
  const x = (i: number) => PAD.l + (i / Math.max(1, points.length - 1)) * (W - PAD.l - PAD.r);
  const yRate = (r: number) => H - PAD.b - (r / maxRate) * (H - PAD.t - PAD.b);
  const yAlt = (a: number) => H - PAD.b - (Math.max(0, Math.min(90, a)) / 90) * (H - PAD.t - PAD.b);
  const ratePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yRate(p.rate).toFixed(1)}`).join(" ");
  const altPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yAlt(p.alt).toFixed(1)}`).join(" ");
  const areaPath = `${ratePath} L${x(points.length - 1).toFixed(1)},${(H - PAD.b).toFixed(1)} L${x(0).toFixed(1)},${(H - PAD.b).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={t("shower.hourlyChart")}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b - f * (H - PAD.t - PAD.b)} y2={H - PAD.b - f * (H - PAD.t - PAD.b)} className="grid-line" />
      ))}
      {points.map((p, i) => (
        <g key={p.time.toISOString()}>
          <circle cx={x(i)} cy={yRate(p.rate)} r="2.5" className="rate-dot">
            <title>{`${fmtHour(p.time)} ${t("shower.expectedRate")}: ${p.rate.toFixed(1)} ${t("shower.perHour")} · ${t("shower.radiantAlt")}: ${p.alt.toFixed(0)}°`}</title>
          </circle>
          {i % 4 === 0 && (
            <text x={x(i)} y={H - 8} textAnchor="middle" className="axis-label">
              {fmtHour(p.time)}
            </text>
          )}
        </g>
      ))}
      <path d={areaPath} className="rate-area" />
      <path d={ratePath} className="rate-line" />
      <path d={altPath} className="alt-line" fill="none" />
      <text x={PAD.l + 4} y={PAD.t + 6} className="chart-label">
        {t("shower.expectedRate")} ({t("shower.perHour")})
      </text>
      <text x={W - PAD.r} y={PAD.t + 6} textAnchor="end" className="chart-label">
        {t("shower.radiantAlt")} (°)
      </text>
    </svg>
  );
}
