'use client';

import { useRef, useState, useCallback } from 'react';

interface TiltButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  tile?: boolean;
  pill?: boolean;
  surface?: string;
  side?: string;
  textColor?: string;
  bordered?: boolean;
}

const SURFACE = '#dc2626';
const SIDE    = '#991b1b';
const ELEVATION = 6;
const TILT = 10;
const RADIUS = 14;

export function TiltButton({ children, onClick, disabled, className = '', tile = false, pill = false, surface = SURFACE, side = SIDE, textColor = '#fff', bordered = false }: TiltButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [glare, setGlare] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTiltX((y - 0.5) * -TILT);
    setTiltY((x - 0.5) * TILT);
    setGlare({ x: x * 100, y: y * 100 });
  }, []);

  const elev = pressed ? 0 : ELEVATION;
  const moveY = pressed ? ELEVATION : 0;

  const transform = hovered
    ? `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(${moveY}px)`
    : `perspective(800px) rotateX(0deg) rotateY(0deg) translateY(${moveY}px)`;

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); setTiltX(0); setTiltY(0); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      className={tile
          ? `relative overflow-hidden cursor-pointer ${className}`
          : `relative overflow-hidden pixel-font text-sm tracking-widest py-3 px-6 disabled:opacity-50 cursor-pointer ${className}`}
      style={{
        background: surface,
        color: textColor,
        borderRadius: pill ? 9999 : RADIUS,
        border: bordered ? '1px solid #d1d5db' : 'none',
        boxShadow: `0 ${elev}px 0 0 ${side}`,
        transform,
        transition: hovered
          ? 'box-shadow 0.075s ease, transform 0.075s ease'
          : 'box-shadow 0.25s ease, transform 0.25s ease',
        willChange: 'transform',
      }}
    >
      {tile ? children : <span className="relative z-10">{children}</span>}
      {hovered && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.25), transparent 55%)`,
            borderRadius: pill ? 9999 : RADIUS,
          }}
        />
      )}
    </button>
  );
}
