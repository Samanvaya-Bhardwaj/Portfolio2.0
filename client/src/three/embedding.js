import { Color } from 'three';

/** Deterministic PRNG so the layout is stable across reloads. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLUSTER_COLORS = ['#8b93ff', '#5eead4', '#a78bfa', '#60a5fa', '#7dd3fc', '#818cf8', '#67e8f9'];

/**
 * Builds a synthetic "embedding space": clustered points (document chunks) plus a sparse
 * k-nearest-neighbour graph between them — the structure a vector index retrieves from.
 */
export function buildEmbeddingSpace(count, { clusters = 7, seed = 7 } = {}) {
  const rand = mulberry32(seed);
  const gauss = () => {
    // Box–Muller
    const u = 1 - rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const centers = Array.from({ length: clusters }, (_, i) => {
    const theta = (i / clusters) * Math.PI * 2 + rand() * 0.6;
    const phi = (rand() - 0.5) * 1.4;
    return [Math.cos(theta) * 4.2, Math.sin(phi) * 2.1, Math.sin(theta) * 2.4];
  });

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const color = new Color();

  for (let i = 0; i < count; i++) {
    const c = i % clusters;
    const spread = 0.45 + rand() * 0.35;
    positions[i * 3] = centers[c][0] + gauss() * spread;
    positions[i * 3 + 1] = centers[c][1] + gauss() * spread * 0.8;
    positions[i * 3 + 2] = centers[c][2] + gauss() * spread;

    color.set(CLUSTER_COLORS[c % CLUSTER_COLORS.length]).offsetHSL(0, 0, (rand() - 0.5) * 0.12);
    colors.set([color.r, color.g, color.b], i * 3);
    sizes[i] = 0.7 + rand() * 0.9;
  }

  // Sparse kNN graph (k = 2) with a distance cut-off, de-duplicated.
  const edgeSet = new Set();
  const maxDist2 = 1.25 * 1.25;
  for (let i = 0; i < count; i++) {
    const nearest = nearestNeighbours(positions, count, positions.subarray(i * 3, i * 3 + 3), 3);
    for (const { index, dist2 } of nearest) {
      if (index === i || dist2 > maxDist2) continue;
      edgeSet.add(i < index ? `${i}-${index}` : `${index}-${i}`);
    }
  }
  const edges = new Float32Array(edgeSet.size * 6);
  let e = 0;
  for (const key of edgeSet) {
    const [a, b] = key.split('-').map(Number);
    edges.set(positions.subarray(a * 3, a * 3 + 3), e);
    edges.set(positions.subarray(b * 3, b * 3 + 3), e + 3);
    e += 6;
  }

  return { positions, colors, sizes, edges };
}

/** Brute-force k-NN — fine for a few hundred points. */
export function nearestNeighbours(positions, count, point, k) {
  const best = [];
  for (let i = 0; i < count; i++) {
    const dx = positions[i * 3] - point[0];
    const dy = positions[i * 3 + 1] - point[1];
    const dz = positions[i * 3 + 2] - point[2];
    const dist2 = dx * dx + dy * dy + dz * dz;
    if (best.length < k || dist2 < best[best.length - 1].dist2) {
      best.push({ index: i, dist2 });
      best.sort((a, b) => a.dist2 - b.dist2);
      if (best.length > k) best.pop();
    }
  }
  return best;
}
