import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Environment } from "@react-three/drei";
import type { Mesh, Group } from "three";

function CapitalBar({
  position,
  height,
  color,
  delay,
}: {
  position: [number, number, number];
  height: number;
  color: string;
  delay: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + delay;
    ref.current.scale.y = 1 + Math.sin(t * 1.2) * 0.12;
    ref.current.position.y = position[1] + Math.sin(t * 1.2) * 0.06;
  });
  return (
    <RoundedBox
      ref={ref}
      args={[0.6, height, 0.6]}
      radius={0.08}
      smoothness={4}
      position={position}
    >
      <meshStandardMaterial color={color} metalness={0.35} roughness={0.25} />
    </RoundedBox>
  );
}

function Coin() {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.8;
  });
  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={ref} position={[2.4, 0.6, 0.5]} rotation={[Math.PI / 2.4, 0, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.18, 48]} />
        <meshStandardMaterial color="#e6b53d" metalness={0.85} roughness={0.18} />
      </mesh>
    </Float>
  );
}

function Scene() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.18;
  });

  const bars: { h: number; c: string }[] = [
    { h: 1.1, c: "#3f6fb5" },
    { h: 1.7, c: "#3aa6a6" },
    { h: 2.4, c: "#2fb37a" },
    { h: 1.9, c: "#4d86c9" },
    { h: 1.35, c: "#3aa6a6" },
  ];

  return (
    <group ref={group} position={[-0.6, -0.7, 0]}>
      {bars.map((b, i) => (
        <CapitalBar
          key={i}
          position={[(i - 2) * 0.85, b.h / 2, 0]}
          height={b.h}
          color={b.c}
          delay={i * 0.6}
        />
      ))}
      <Coin />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#1e2a44" metalness={0.2} roughness={0.9} transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

export function Capital3D() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 2.2, 6.5], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={1.3} />
      <directionalLight position={[-4, 3, -2]} intensity={0.5} color="#7fb2ff" />
      <Scene />
      <Environment preset="city" />
    </Canvas>
  );
}
