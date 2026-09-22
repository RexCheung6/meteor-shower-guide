import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkle: number;
  phase: number;
  tint: "white" | "gold" | "blue";
};

type StarfieldCanvasProps = {
  className?: string;
};

const STAR_COLORS = {
  white: [232, 241, 255],
  gold: [255, 209, 102],
  blue: [111, 168, 220]
} as const;

function createRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function makeStars(width: number, height: number): Star[] {
  const random = createRandom(20260922);
  const count = width < 600
    ? Math.min(110, Math.max(48, Math.round((width * height) / 13500)))
    : Math.min(180, Math.max(72, Math.round((width * height) / 10500)));
  const tints: Star["tint"][] = ["white", "white", "white", "gold", "blue"];

  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    radius: 0.45 + random() * 1.35,
    alpha: 0.25 + random() * 0.65,
    twinkle: 0.3 + random() * 1.2,
    phase: random() * Math.PI * 2,
    tint: tints[Math.floor(random() * tints.length)]
  }));
}

export default function StarfieldCanvas({ className = "" }: StarfieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let frame = 0;
    let visible = !document.hidden;
    let pointerX = 0;
    let pointerY = 0;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      stars = makeStars(width, height);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw(0);
    };

    const draw = (time: number) => {
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);

      const glow = context.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.42, width * 0.7);
      glow.addColorStop(0, "rgba(56, 88, 160, 0.2)");
      glow.addColorStop(0.48, "rgba(35, 54, 112, 0.08)");
      glow.addColorStop(1, "rgba(11, 16, 32, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      for (const star of stars) {
        const driftX = pointerX * star.radius * 2.2;
        const driftY = pointerY * star.radius * 1.4;
        const pulse = reducedMotion ? 1 : 0.72 + Math.sin(time * 0.001 * star.twinkle + star.phase) * 0.28;
        const [red, green, blue] = STAR_COLORS[star.tint];
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${Math.max(0.08, star.alpha * pulse)})`;
        context.beginPath();
        context.arc(star.x + driftX, star.y + driftY, star.radius, 0, Math.PI * 2);
        context.fill();
      }

      if (!reducedMotion) {
        const cycle = (time % 11000) / 11000;
        if (cycle < 0.18) {
          const progress = cycle / 0.18;
          const startX = width * 0.12 + width * 0.44 * progress;
          const startY = height * 0.18 + height * 0.22 * progress;
          const length = 64 + width * 0.06;
          const gradient = context.createLinearGradient(startX, startY, startX - length, startY - length * 0.62);
          gradient.addColorStop(0, "rgba(255, 230, 169, 0.85)");
          gradient.addColorStop(1, "rgba(111, 168, 220, 0)");
          context.strokeStyle = gradient;
          context.lineWidth = 1.5;
          context.beginPath();
          context.moveTo(startX, startY);
          context.lineTo(startX - length, startY - length * 0.62);
          context.stroke();
        }
      }
    };

    const animate = (time: number) => {
      if (!visible) return;
      draw(time);
      frame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
      pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
    };
    const handleVisibility = () => {
      visible = !document.hidden;
      window.cancelAnimationFrame(frame);
      if (visible && !reducedMotion) frame = window.requestAnimationFrame(animate);
    };

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(container);
    canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    resize();
    if (!reducedMotion) frame = window.requestAnimationFrame(animate);

    return () => {
      observer?.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className={`starfield-canvas ${className}`} aria-hidden="true" />;
}
