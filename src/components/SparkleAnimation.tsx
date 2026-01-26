import { useEffect, useState, RefObject } from "react";
import { cn } from "@/lib/utils";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

interface SparkleAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
  containerRef?: RefObject<HTMLElement> | null;
}

const SparkleAnimation = ({ isActive, onComplete, containerRef }: SparkleAnimationProps) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (isActive) {
      // Get container position if ref is provided
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }

      // Generate more sparkles with staggered timing for 3-second animation
      const newSparkles: Sparkle[] = Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: 10 + Math.random() * 80, // Spread across container (10-90%)
        y: 10 + Math.random() * 80, // Spread across container (10-90%)
        size: 4 + Math.random() * 10,
        delay: Math.random() * 2, // Stagger over 2 seconds for continuous effect
      }));
      
      setSparkles(newSparkles);
      setIsVisible(true);

      // Auto-hide after 3 seconds
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setSparkles([]);
        setPosition(null);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [isActive, onComplete, containerRef]);

  if (!isVisible || sparkles.length === 0) return null;

  // If we have a container position, render inside it, otherwise don't render
  if (!position) return null;

  return (
    <div 
      className="fixed pointer-events-none z-[9999] overflow-hidden rounded-2xl"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
      }}
    >
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute animate-sparkle"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            animationDelay: `${sparkle.delay}s`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-full h-full"
          >
            <path
              d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
              fill="currentColor"
              className="text-primary/60"
            />
          </svg>
        </div>
      ))}
      {/* Central glow */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full animate-sparkle-glow"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
        }}
      />
    </div>
  );
};

export default SparkleAnimation;
