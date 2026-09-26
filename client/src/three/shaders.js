export const pointVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aHighlight;
  uniform float uPixelRatio;
  uniform float uTime;
  varying vec3 vColor;
  varying float vHighlight;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Gentle per-point shimmer so the field feels alive without distracting.
    float shimmer = 0.85 + 0.15 * sin(uTime * 1.3 + position.x * 2.1 + position.y * 3.7);
    float size = aSize * shimmer * (1.0 + aHighlight * 1.8);
    gl_PointSize = size * uPixelRatio * (64.0 / -mvPosition.z);

    vColor = mix(aColor, vec3(1.0), aHighlight * 0.55);
    vHighlight = aHighlight;
  }
`;

export const pointFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vHighlight;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float alpha = pow(core, 1.4) * (0.85 + vHighlight * 0.15);
    gl_FragColor = vec4(vColor, alpha);
  }
`;
