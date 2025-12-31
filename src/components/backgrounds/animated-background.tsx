import { useEffect, useRef } from "react";

interface Circle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const circles: Circle[] = [];
    const circleCount = 20;

    for (let i = 0; i < circleCount; i++) {
      circles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 100,
        size: Math.random() * 40 + 10,
        speed: Math.random() * 0.8 + 0.2,
        opacity: Math.random() * 0.15 + 0.05,
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      circles.forEach((circle) => {
        circle.y -= circle.speed;

        if (circle.y < -circle.size) {
          circle.y = canvas.height + circle.size;
          circle.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 149, 237, ${circle.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-0" />;
};
