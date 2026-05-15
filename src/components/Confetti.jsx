import { useEffect, useRef } from 'react';
import { feedbackAirhorn } from '../utils/gameFeedback.js';
import { usePrefersReducedMotion } from '../utils/usePrefersReducedMotion.js';
import './Confetti.css';

const COLORS = ['#6ec9ff', '#f0c14a', '#c4a8ff', '#5ee9b8', '#ff8fab', '#9ab8ff', '#4ade80'];
const DURATION_MS = 3200;
const PARTICLE_COUNT = 56;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function Confetti({ active = false }) {
  const canvasRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!active || reducedMotion) return undefined;

    feedbackAirhorn();

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let frame = 0;
    let start = 0;
    let running = true;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const width = rect?.width ?? window.innerWidth;
      const height = rect?.height ?? window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height };
    };

    let { width, height } = resize();

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: randomBetween(0, width),
      y: randomBetween(-height * 0.2, -12),
      size: randomBetween(5, 9),
      rotation: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-0.12, 0.12),
      vx: randomBetween(-1.4, 1.4),
      vy: randomBetween(2.2, 5.2),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      drift: randomBetween(-0.4, 0.4),
    }));

    const draw = (now) => {
      if (!running) return;
      if (!start) start = now;
      const elapsed = now - start;
      const fade = elapsed > DURATION_MS - 600 ? (DURATION_MS - elapsed) / 600 : 1;

      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.x += particle.vx + particle.drift;
        particle.y += particle.vy;
        particle.vy += 0.055;
        particle.rotation += particle.spin;

        if (particle.y > height + 20) {
          particle.y = randomBetween(-24, -8);
          particle.x = randomBetween(0, width);
          particle.vy = randomBetween(2.2, 4.8);
        }

        context.save();
        context.globalAlpha = Math.max(0, fade);
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
        context.restore();
      });

      if (elapsed < DURATION_MS) {
        frame = requestAnimationFrame(draw);
      }
    };

    const onResize = () => {
      ({ width, height } = resize());
    };

    window.addEventListener('resize', onResize);
    frame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [active, reducedMotion]);

  if (!active || reducedMotion) return null;

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden />;
}
