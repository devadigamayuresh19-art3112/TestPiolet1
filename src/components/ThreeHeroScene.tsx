import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Reusable math vectors to avoid GC in animation loop
const _tempVec3 = new THREE.Vector3();

// 3D Floating Browser Window Model (Built procedurally with Three.js primitives & materials)
function FloatingBrowser({ pointer, isTransitioning }: { pointer: React.MutableRefObject<{ x: number; y: number }>; isTransitioning: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const browserBodyRef = useRef<THREE.Mesh>(null);
  const radarRingRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Subtle pointer parallax + gentle hovering
    const targetX = (pointer.current.x * 0.4) + Math.sin(t * 0.4) * 0.1;
    const targetY = (pointer.current.y * 0.3) + Math.cos(t * 0.5) * 0.12;

    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 2.5, delta);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 2.5, delta);

    // Subtle tilt
    const targetRotX = pointer.current.y * 0.18 + Math.sin(t * 0.3) * 0.05;
    const targetRotY = pointer.current.x * 0.22 + Math.cos(t * 0.3) * 0.06;

    if (isTransitioning) {
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, -3.5, 4.0, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY + 0.8, 3.0, delta);
    } else {
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, 0, 2.0, delta);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 2.5, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 2.5, delta);
    }

    if (radarRingRef.current) {
      radarRingRef.current.rotation.z += delta * 0.8;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central 3D Browser Window Frame */}
      <group position={[0, 0.2, 0]}>
        {/* Main Browser Chassis / Outer Shell */}
        <mesh ref={browserBodyRef} castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[4.2, 2.7, 0.14]} />
          <meshStandardMaterial
            color="#0D3D29"
            roughness={0.25}
            metalness={0.7}
            emissive="#082619"
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Browser Top Navigation Bar */}
        <mesh position={[0, 1.15, 0.08]}>
          <boxGeometry args={[4.14, 0.34, 0.04]} />
          <meshStandardMaterial color="#18583D" roughness={0.3} metalness={0.6} />
        </mesh>

        {/* Window Control Buttons (Red, Amber, Green Dots in 3D) */}
        <mesh position={[-1.85, 1.15, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
          <meshStandardMaterial color="#D64545" roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh position={[-1.72, 1.15, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
          <meshStandardMaterial color="#D99525" roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh position={[-1.59, 1.15, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
          <meshStandardMaterial color="#61B487" roughness={0.2} metalness={0.4} />
        </mesh>

        {/* URL Pill Bar */}
        <mesh position={[0.2, 1.15, 0.11]}>
          <boxGeometry args={[2.5, 0.2, 0.02]} />
          <meshStandardMaterial color="#0A2D1E" roughness={0.4} metalness={0.5} />
        </mesh>

        {/* Viewport Screen / Canvas Area */}
        <mesh position={[0, -0.15, 0.08]}>
          <planeGeometry args={[4.04, 2.18]} />
          <meshStandardMaterial
            color="#061C12"
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>

        {/* Inner Code Editor Panel Inside the Browser */}
        <group position={[-1.0, -0.15, 0.1]}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1.8, 1.9]} />
            <meshStandardMaterial color="#0B2317" roughness={0.5} />
          </mesh>
          {/* Simulated Code Lines */}
          {[0.6, 0.35, 0.1, -0.15, -0.4, -0.65].map((y, idx) => (
            <mesh key={idx} position={[(idx % 2 === 0 ? -0.2 : 0.0), y, 0.01]}>
              <planeGeometry args={[idx % 3 === 0 ? 1.2 : 0.9, 0.06]} />
              <meshBasicMaterial color={idx === 1 ? '#61B487' : idx === 4 ? '#EAF5EE' : '#2D7554'} />
            </mesh>
          ))}
        </group>

        {/* Inner Test Verification Panel */}
        <group position={[1.05, -0.15, 0.1]}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1.7, 1.9]} />
            <meshStandardMaterial color="#081E14" roughness={0.5} />
          </mesh>
          {/* Status Rows */}
          {[0.55, 0.15, -0.25, -0.65].map((y, idx) => (
            <group key={idx} position={[0, y, 0.01]}>
              {/* Checkmark badge or bug indicator */}
              <mesh position={[-0.6, 0, 0]}>
                <circleGeometry args={[0.09, 16]} />
                <meshBasicMaterial color={idx === 2 ? '#D64545' : '#61B487'} />
              </mesh>
              {/* Label line */}
              <mesh position={[0.1, 0, 0]}>
                <planeGeometry args={[1.0, 0.06]} />
                <meshBasicMaterial color="#A4D1B8" />
              </mesh>
            </group>
          ))}
        </group>

        {/* 3D Rotating Radar / Testing Scanner Ring */}
        <mesh ref={radarRingRef} position={[1.5, 0.7, 0.16]}>
          <ringGeometry args={[0.22, 0.26, 32]} />
          <meshBasicMaterial color="#61B487" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Orbiting Satellite Test Case Cards */}
      <OrbitingCards pointer={pointer} />

      {/* Floating 3D Bug / Inspection Prism */}
      <FloatingBugIcon />
    </group>
  );
}

// Orbiting test cards around the main browser
function OrbitingCards({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const card1Ref = useRef<THREE.Group>(null);
  const card2Ref = useRef<THREE.Group>(null);
  const card3Ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (card1Ref.current) {
      card1Ref.current.position.x = -2.8 + Math.cos(t * 0.7) * 0.25 + pointer.current.x * 0.2;
      card1Ref.current.position.y = 1.1 + Math.sin(t * 0.9) * 0.2 - pointer.current.y * 0.15;
      card1Ref.current.rotation.z = Math.sin(t * 0.5) * 0.08;
    }

    if (card2Ref.current) {
      card2Ref.current.position.x = 2.9 + Math.sin(t * 0.6) * 0.2 + pointer.current.x * 0.15;
      card2Ref.current.position.y = -0.7 + Math.cos(t * 0.8) * 0.2 - pointer.current.y * 0.15;
      card2Ref.current.rotation.z = -Math.cos(t * 0.4) * 0.07;
    }

    if (card3Ref.current) {
      card3Ref.current.position.x = -2.6 + Math.sin(t * 0.5) * 0.2;
      card3Ref.current.position.y = -1.2 + Math.cos(t * 0.7) * 0.25;
      card3Ref.current.rotation.z = Math.sin(t * 0.6) * 0.06;
    }
  });

  return (
    <>
      {/* Test Card 1: Assertion Passed */}
      <group ref={card1Ref} position={[-2.8, 1.1, 0.4]}>
        <mesh castShadow>
          <boxGeometry args={[1.6, 0.9, 0.08]} />
          <meshStandardMaterial color="#0A3322" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[-0.55, 0.2, 0.05]}>
          <circleGeometry args={[0.1, 16]} />
          <meshBasicMaterial color="#61B487" />
        </mesh>
        <mesh position={[0.1, 0.2, 0.05]}>
          <planeGeometry args={[0.9, 0.06]} />
          <meshBasicMaterial color="#EAF5EE" />
        </mesh>
        <mesh position={[0, -0.15, 0.05]}>
          <planeGeometry args={[1.2, 0.05]} />
          <meshBasicMaterial color="#61B487" />
        </mesh>
      </group>

      {/* Test Card 2: Playwright Chromium Hook */}
      <group ref={card2Ref} position={[2.9, -0.7, 0.35]}>
        <mesh castShadow>
          <boxGeometry args={[1.7, 1.0, 0.08]} />
          <meshStandardMaterial color="#0B2B1D" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[-0.6, 0.22, 0.05]}>
          <circleGeometry args={[0.09, 16]} />
          <meshBasicMaterial color="#61B487" />
        </mesh>
        <mesh position={[0.1, 0.22, 0.05]}>
          <planeGeometry args={[1.0, 0.05]} />
          <meshBasicMaterial color="#EAF5EE" />
        </mesh>
        <mesh position={[0, -0.1, 0.05]}>
          <planeGeometry args={[1.3, 0.05]} />
          <meshBasicMaterial color="#408E64" />
        </mesh>
        <mesh position={[0, -0.28, 0.05]}>
          <planeGeometry args={[0.9, 0.04]} />
          <meshBasicMaterial color="#2B6B4A" />
        </mesh>
      </group>

      {/* Test Card 3: DOM Health Checked */}
      <group ref={card3Ref} position={[-2.6, -1.2, 0.3]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.8, 0.07]} />
          <meshStandardMaterial color="#0D3825" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[-0.5, 0.15, 0.05]}>
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial color="#61B487" />
        </mesh>
        <mesh position={[0.1, 0.15, 0.05]}>
          <planeGeometry args={[0.8, 0.05]} />
          <meshBasicMaterial color="#EAF5EE" />
        </mesh>
        <mesh position={[0, -0.15, 0.05]}>
          <planeGeometry args={[1.1, 0.04]} />
          <meshBasicMaterial color="#61B487" />
        </mesh>
      </group>
    </>
  );
}

// 3D Bug / Inspection Object Floating in Scene
function FloatingBugIcon() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x += delta * 0.4;
    meshRef.current.rotation.y += delta * 0.6;
    meshRef.current.position.y = 1.6 + Math.sin(t * 1.2) * 0.15;
  });

  return (
    <group ref={meshRef} position={[2.6, 1.6, 0.6]} scale={[0.45, 0.45, 0.45]}>
      {/* Central Gem / Bug Core */}
      <mesh>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial
          color="#61B487"
          roughness={0.2}
          metalness={0.8}
          emissive="#18583D"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Outer Wireframe Ring */}
      <mesh>
        <torusGeometry args={[1.1, 0.04, 16, 32]} />
        <meshStandardMaterial color="#A4D1B8" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// Background Floating Ambient Particles
function FloatingParticles({ count = 80 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const particlesPosition = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    return positions;
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.02;
    pointsRef.current.rotation.x += delta * 0.01;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particlesPosition, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#61B487"
        transparent
        opacity={0.65}
        sizeAttenuation
      />
    </points>
  );
}

interface ThreeHeroSceneProps {
  onLetsGo: () => void;
}

export function ThreeHeroScene({ onLetsGo }: ThreeHeroSceneProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });

  // Animated terminal messages
  const [terminalIndex, setTerminalIndex] = useState(0);
  const terminalLines = [
    '> Initializing test environment...',
    '> Browser automation ready...',
    '> Waiting for your next target...',
  ];

  useEffect(() => {
    // Check WebGL availability safely
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }

    const interval = setInterval(() => {
      setTerminalIndex((prev) => (prev < terminalLines.length - 1 ? prev + 1 : prev));
    }, 900);

    const handlePointerMove = (e: MouseEvent) => {
      // Normalize pointer [-1, 1]
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handlePointerMove);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, []);

  const handleStart = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onLetsGo();
    }, 450);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#071F14] text-white select-none">
      {/* Background 3D Canvas */}
      {hasWebGL ? (
        <div className="absolute inset-0 w-full h-full">
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 0, 5.8], fov: 48 }}
          >
            <color attach="background" args={['#071F14']} />
            <fog attach="fog" args={['#071F14', 6, 15]} />

            <ambientLight intensity={0.6} />
            <directionalLight
              position={[5, 6, 6]}
              intensity={1.4}
              color="#EAF5EE"
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <directionalLight
              position={[-5, -3, 3]}
              intensity={0.6}
              color="#61B487"
            />
            <pointLight position={[0, 2, 2]} intensity={0.8} color="#61B487" />

            <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.3}>
              <FloatingBrowser pointer={pointer} isTransitioning={isTransitioning} />
            </Float>

            <FloatingParticles count={90} />
          </Canvas>
        </div>
      ) : (
        /* High-fidelity CSS Fallback if WebGL is disabled or unsupported */
        <div className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-b from-[#071F14] via-[#0D3D29] to-[#05160E]">
          <div className="max-w-xl p-8 rounded-2xl bg-[#0D3D29]/80 border border-[#61B487]/30 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-[#D64545]" />
              <div className="w-3 h-3 rounded-full bg-[#D99525]" />
              <div className="w-3 h-3 rounded-full bg-[#61B487]" />
              <span className="text-xs text-[#A4D1B8] ml-4 font-mono">browser_debug_console.exe</span>
            </div>
            <div className="space-y-2 font-mono text-sm text-[#A4D1B8]">
              <div>[SYSTEM] Autonomous QA Engineer initialized.</div>
              <div>[SYSTEM] Chromium engine connected.</div>
              <div>[READY] TestPilot AI awaiting target.</div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle vignette and scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(97,180,135,0.06)_0%,rgba(7,31,20,0.85)_100%)]" />

      {/* Clean Introductory Content Layer (Semantic DOM Text Overlay) */}
      <div className="relative z-10 flex flex-col justify-between w-full h-full max-w-6xl px-6 py-10 mx-auto pointer-events-none md:py-14 md:px-12">
        {/* Top Branding Eyebrow */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#18583D] border border-[#61B487]/40 flex items-center justify-center text-[#EAF5EE] font-bold text-sm tracking-wider">
              TP
            </div>
            <div className="text-left">
              <span className="block text-xs font-semibold tracking-wider text-[#A4D1B8] uppercase">
                Autonomous QA Engineer
              </span>
              <span className="text-base font-bold text-white tracking-tight">TestPilot AI</span>
            </div>
          </div>
          
          <div className="hidden sm:block text-right">
            <span className="text-xs font-mono text-[#A4D1B8]/80">VIT Code Apex 3.0 · Team Latent</span>
          </div>
        </div>

        {/* Center / Lower-Center Hero Text Box */}
        <div className="max-w-2xl my-auto text-left">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-medium tracking-wide uppercase rounded-md bg-[#18583D]/60 text-[#A4D1B8] border border-[#61B487]/20">
            Autonomous Quality Assurance
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl leading-[1.08] text-balance">
            Every Bug Has a Story.<br />
            <span className="text-[#61B487]">Let's Find It.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[#DDE8E0]/90 leading-relaxed max-w-xl">
            Meet TestPilot AI — your intelligent companion for exploring, testing, and debugging web applications.
          </p>

          {/* Animated Virtual Terminal */}
          <div className="mt-6 p-4 rounded-xl bg-[#092418]/85 border border-[#18583D] font-mono text-xs text-[#A4D1B8] max-w-lg shadow-lg">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#18583D]/60 text-[10px] text-[#61B487] uppercase tracking-wider">
              <span>Environment Status</span>
              <span>·</span>
              <span>Headless Runner</span>
            </div>
            <div className="space-y-1">
              {terminalLines.slice(0, terminalIndex + 1).map((line, idx) => (
                <div key={idx} className="transition-opacity duration-300">
                  {line}
                </div>
              ))}
              {terminalIndex === terminalLines.length - 1 && (
                <div className="text-[#EAF5EE] animate-pulse">_</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Action Area: EXACTLY ONE VISIBLE INTERACTIVE NAVIGATION BUTTON */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-4 border-t border-[#18583D]/40">
          <div className="text-xs text-[#A4D1B8]/70 hidden sm:block">
            Press the action below to enter the workspace and launch tests.
          </div>

          <div className="pointer-events-auto">
            <button
              onClick={handleStart}
              disabled={isTransitioning}
              className="group relative inline-flex items-center gap-3 px-8 py-4 text-sm font-semibold tracking-wide text-white transition-all duration-300 rounded-xl bg-[#18583D] hover:bg-[#206E4D] border border-[#61B487]/50 shadow-[0_0_24px_rgba(97,180,135,0.25)] hover:shadow-[0_0_36px_rgba(97,180,135,0.4)] active:scale-[0.98] cursor-pointer"
            >
              <span>{isTransitioning ? 'Entering Workspace...' : "LET'S GO"}</span>
              <span className="text-[#61B487] group-hover:translate-x-1 transition-transform duration-200">
                →
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
