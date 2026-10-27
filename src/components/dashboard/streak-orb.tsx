"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ringPositions } from "@/lib/dashboard/ring";

const SIZE = 168;
/** Beyond this the ring is a solid circle and more points add nothing. */
const MAX_POINTS = 60;
const GATHER_MS = 1600;

/**
 * The process colour as sRGB channels. The token is an `oklch()` value, which
 * three.js cannot parse; a 2D canvas can, so one pixel painted in it is read
 * back as RGB.
 */
function processRgb(host: HTMLElement): [number, number, number] | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = getComputedStyle(host).getPropertyValue("--process");
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

function hasWebGl(): boolean {
  const probe = document.createElement("canvas");
  return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
}

/**
 * The ring is always this SVG; its points are drawn here before three.js has
 * loaded, without WebGL and under reduced motion. The coordinates are rounded (`ringPositions`), or server and browser print
 * a different last digit and the markup fails to hydrate. Colours come from
 * classes, never from presentation attributes (Design.md §2).
 */
function StaticRing({
  count,
  ghost,
  points,
}: {
  count: number;
  ghost: boolean;
  /** False once three.js draws the points. */
  points: boolean;
}) {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox="-1.3 -1.3 2.6 2.6"
      aria-hidden="true"
    >
      <circle r="1" className="fill-none stroke-border" strokeWidth="0.01" />
      {points &&
        ringPositions(count).map((point) => (
          <circle
            key={`${point.x},${point.y}`}
            cx={point.x}
            cy={point.y}
            r="0.05"
            className={`fill-process ${ghost ? "opacity-30" : ""}`}
          />
        ))}
    </svg>
  );
}

/**
 * The current logging streak as a ring with one point per day (Design.md
 * §3.2). With no current streak the longest one is drawn dimmed, as a target.
 *
 * three.js is imported inside the effect, so it never reaches the server
 * bundle or the first paint. Once it is there it draws the ring; at a process
 * moment the points first gather from a scattered cloud while the ring turns
 * once. Either way the render loop stops after its last frame, so nothing
 * moves at rest.
 */
export function StreakOrb({
  streak,
  longest,
  moment,
}: {
  streak: number;
  longest: number;
  /** A process moment happened since the last visit: play the gathering once. */
  moment: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [live, setLive] = useState(false);
  const ghost = streak === 0;
  const count = Math.min(ghost ? longest : streak, MAX_POINTS);

  useEffect(() => {
    if (reduceMotion || count === 0) return;
    let disposed = false;
    let cleanup = () => {};

    void import("three").then((THREE) => {
      const element = host.current;
      if (disposed || !element || !hasWebGl()) return;
      const rgb = processRgb(element);
      if (!rgb) return;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(SIZE, SIZE);
      element.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(0, 0, 3.6);

      // Screen y grows downwards, three's upwards: flip it so the first day
      // sits at the top like on the SVG ring.
      const targets = ringPositions(count).map(
        ({ x, y }) => new THREE.Vector3(x, -y, 0),
      );
      const starts = targets.map(
        () =>
          new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 3,
          ),
      );
      const positions = new Float32Array(count * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const material = new THREE.PointsMaterial({
        color: new THREE.Color().setRGB(...rgb, THREE.SRGBColorSpace),
        size: 0.11,
        transparent: true,
        opacity: ghost ? 0.3 : 0.95,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);

      const ease = (t: number) => 1 - (1 - t) ** 3;
      // Without a moment the first frame is already the last one.
      const startedAt = moment ? performance.now() : -GATHER_MS;
      let frame = 0;

      function tick(now: number) {
        const t = Math.min((now - startedAt) / GATHER_MS, 1);
        targets.forEach((target, index) => {
          // Each point leaves a little after the one before it.
          const local = ease(
            Math.min(Math.max(t * 1.4 - (index / count) * 0.4, 0), 1),
          );
          const from = starts[index];
          positions[index * 3] = from.x + (target.x - from.x) * local;
          positions[index * 3 + 1] = from.y + (target.y - from.y) * local;
          positions[index * 3 + 2] = from.z + (target.z - from.z) * local;
        });
        geometry.attributes.position.needsUpdate = true;
        points.rotation.z = (1 - ease(t)) * Math.PI * 2;
        points.rotation.x = (1 - ease(t)) * 0.5;
        renderer.render(scene, camera);
        if (t < 1) frame = requestAnimationFrame(tick);
      }

      setLive(true);
      frame = requestAnimationFrame(tick);
      cleanup = () => {
        cancelAnimationFrame(frame);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
      setLive(false);
    };
  }, [moment, reduceMotion, count, ghost]);

  return (
    // size-42 is SIZE (168 px); a class, since inline styles are reserved for
    // positions measured at runtime.
    <div className="relative flex size-42 items-center justify-center">
      <div ref={host} className="absolute inset-0 [&>canvas]:!size-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <StaticRing count={count} ghost={ghost} points={!live} />
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-semibold text-3xl text-process tabular-nums">
          {streak}
        </span>
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
          day streak
        </span>
      </div>
    </div>
  );
}
