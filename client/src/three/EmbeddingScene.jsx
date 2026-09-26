import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Vector3 } from 'three';
import { buildEmbeddingSpace, nearestNeighbours } from './embedding.js';
import { pointFragmentShader, pointVertexShader } from './shaders.js';

const K = 5; // neighbours retrieved per query
const RETRIEVE_EVERY = 0.2; // seconds between k-NN searches

/**
 * Point cloud of "document chunks" with a moving query probe that retrieves its k nearest
 * neighbours in real time — a visual metaphor for vector search in a RAG pipeline.
 */
function EmbeddingField({ count, animate }) {
  const group = useRef();
  const pointsRef = useRef();
  const probeRef = useRef();
  const queryLines = useRef();
  const { gl } = useThree();

  const space = useMemo(() => buildEmbeddingSpace(count), [count]);
  const highlight = useMemo(() => new Float32Array(count), [count]);
  const target = useMemo(() => new Float32Array(count), [count]);
  const queryPositions = useMemo(() => new Float32Array(K * 6), []);
  const state = useRef({ t: 0, lastSearch: -1, neighbours: [] });
  const probe = useMemo(() => new Vector3(), []);

  const uniforms = useMemo(
    () => ({ uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) }, uTime: { value: 0 } }),
    [gl],
  );

  useFrame(({ pointer }, delta) => {
    const s = state.current;
    const dt = Math.min(delta, 0.05);
    if (animate) s.t += dt;
    const t = s.t + 4; // start mid-path so the first frame already looks composed

    // Drift + pointer parallax.
    if (group.current) {
      group.current.rotation.y += animate ? dt * 0.035 : 0;
      group.current.rotation.x += (pointer.y * 0.12 - group.current.rotation.x) * 0.04;
      group.current.position.x += (pointer.x * 0.35 - group.current.position.x) * 0.04;
    }
    uniforms.uTime.value = t;

    // Query probe wanders through the space along a Lissajous path.
    probe.set(Math.sin(t * 0.21) * 3.8, Math.sin(t * 0.33 + 1.2) * 1.7, Math.cos(t * 0.17) * 2.2);
    probeRef.current?.position.copy(probe);

    if (s.t - s.lastSearch > RETRIEVE_EVERY || s.lastSearch < 0) {
      s.lastSearch = s.t;
      s.neighbours = nearestNeighbours(space.positions, count, [probe.x, probe.y, probe.z], K);
      target.fill(0);
      for (const n of s.neighbours) target[n.index] = 1;
    }

    // Ease highlights toward their targets for smooth fade in/out.
    const ease = animate ? 1 - Math.pow(0.001, dt) : 1;
    for (let i = 0; i < count; i++) highlight[i] += (target[i] - highlight[i]) * ease;
    const hAttr = pointsRef.current?.geometry.attributes.aHighlight;
    if (hAttr) hAttr.needsUpdate = true;

    // Lines from the probe to each retrieved neighbour.
    s.neighbours.forEach((n, i) => {
      queryPositions.set([probe.x, probe.y, probe.z], i * 6);
      queryPositions.set(space.positions.subarray(n.index * 3, n.index * 3 + 3), i * 6 + 3);
    });
    const qAttr = queryLines.current?.geometry.attributes.position;
    if (qAttr) qAttr.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[space.positions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[space.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[space.sizes, 1]} />
          <bufferAttribute attach="attributes-aHighlight" args={[highlight, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={pointVertexShader}
          fragmentShader={pointFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[space.edges, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#8b93ff" transparent opacity={0.07} depthWrite={false} blending={AdditiveBlending} />
      </lineSegments>

      <lineSegments ref={queryLines}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[queryPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#e6fffb" transparent opacity={0.45} depthWrite={false} blending={AdditiveBlending} />
      </lineSegments>

      <group ref={probeRef}>
        <mesh>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.22, 20, 20]} />
          <meshBasicMaterial color="#5eead4" transparent opacity={0.14} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Canvas wrapper with performance guards: renders only while on screen and the tab is visible,
 * uses fewer points on small screens, clamps DPR, and honours prefers-reduced-motion.
 */
export default function EmbeddingScene({ className }) {
  const wrapper = useRef();
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState === 'visible');
  const [webgl] = useState(supportsWebGL);
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const count = useMemo(() => (window.innerWidth < 768 ? 150 : 280), []);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: '100px',
    });
    observer.observe(el);
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!webgl) return <div className={`${className} scene-fallback`} aria-hidden="true" />;

  const frameloop = reducedMotion ? 'demand' : onScreen && tabVisible ? 'always' : 'never';

  return (
    <div ref={wrapper} className={className} aria-hidden="true">
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 9], fov: 50, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <EmbeddingField count={count} animate={!reducedMotion} />
      </Canvas>
    </div>
  );
}
