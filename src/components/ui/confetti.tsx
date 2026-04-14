"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COLORS = [
  "#e11d48", // rose-600
  "#f59e0b", // amber-500 (gold)
  "#fda4af", // rose-300 (blush)
  "#86efac", // green-300 (sage)
  "#fb7185", // rose-400
  "#fbbf24", // amber-400
  "#fecdd3", // rose-200
  "#a7f3d0", // emerald-200
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: "heart" | "circle";
  opacity: number;
  life: number;
}

function createParticle(canvasWidth: number): Particle {
  return {
    x: canvasWidth * 0.5 + (Math.random() - 0.5) * canvasWidth * 0.4,
    y: -10,
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.15,
    shape: Math.random() > 0.5 ? "heart" : "circle",
    opacity: 1,
    life: 1,
  };
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
  opacity: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size * 0.5;
  ctx.moveTo(0, s * 0.4);
  ctx.bezierCurveTo(-s, -s * 0.4, -s, -s, 0, -s * 0.5);
  ctx.bezierCurveTo(s, -s, s, -s * 0.4, 0, s * 0.4);
  ctx.fill();
  ctx.restore();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

let globalTrigger: (() => void) | null = null;

export function triggerConfetti() {
  if (globalTrigger) {
    globalTrigger();
  }
}

export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const [active, setActive] = useState(false);

  const burst = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const particles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      const p = createParticle(canvas.width);
      p.vy = Math.random() * 4 + 1;
      p.vx = (Math.random() - 0.5) * 10;
      p.y = canvas.height * 0.3 + (Math.random() - 0.5) * canvas.height * 0.2;
      p.x = canvas.width * 0.5 + (Math.random() - 0.5) * canvas.width * 0.3;
      p.vy = -(Math.random() * 8 + 4);
      particles.push(p);
    }
    particlesRef.current = particles;
    setActive(true);
  }, []);

  useEffect(() => {
    globalTrigger = burst;
    return () => {
      globalTrigger = null;
    };
  }, [burst]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let running = true;

    function animate() {
      if (!running || !ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      let aliveCount = 0;

      for (const p of particles) {
        p.vy += 0.15; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vx *= 0.99;

        // Fade out when falling below 80% of canvas height
        if (p.y > canvas.height * 0.7) {
          p.life -= 0.02;
          p.opacity = Math.max(0, p.life);
        }

        if (p.opacity <= 0 || p.y > canvas.height + 20) continue;

        aliveCount++;

        if (p.shape === "heart") {
          drawHeart(ctx, p.x, p.y, p.size, p.rotation, p.color, p.opacity);
        } else {
          drawCircle(ctx, p.x, p.y, p.size, p.color, p.opacity);
        }
      }

      if (aliveCount > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setActive(false);
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  );
}
