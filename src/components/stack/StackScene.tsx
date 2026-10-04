'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { STACK_EDGES, STACK_LAYERS, STACK_NODES, type StackLayerId } from '@/lib/content/stack';

export type SceneEdge = { from: string; to: string };
export type SceneInsets = { top: number; right: number; bottom: number; left: number };

type Props = {
  selectedId: string | null;
  journeyEdges: SceneEdge[] | null;
  activeEdge: SceneEdge | null;
  reducedMotion: boolean;
  // Ways to keep clear of the overlays (title, panel), in CSS pixels; the fit that gives the largest model wins.
  getInsets: () => SceneInsets[];
  layoutKey: number;
  onSelect: (id: string) => void;
  onUnavailable: () => void;
};

type SceneState = {
  nodes: Map<string, { mesh: THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial>; label: HTMLButtonElement }>;
  edges: Map<string, { mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>; curve: THREE.QuadraticBezierCurve3 }>;
  particle: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  fit: () => void;
  flow: { curve: THREE.QuadraticBezierCurve3; reverse: boolean; startedAt: number } | null;
};

// Layers are stacked along y like shelves, each layer's nodes in one row along x, seen from the front.
const LAYER_GAP = 3;
// Nodes share one span per shelf, so layers with fewer nodes get more room between labels.
const NODE_SPAN = 12;
const MAX_NODE_SPACING = 6;
// Room at the left end of each shelf for the layer name.
const LABEL_ZONE = 4;
const LAYER_Y = Object.fromEntries(STACK_LAYERS.map((layer, index) => [layer.id, ((STACK_LAYERS.length - 1) / 2 - index) * LAYER_GAP])) as Record<StackLayerId, number>;
const PLATFORM_DEPTH = 2.6;
const VIEW_POLAR = THREE.MathUtils.degToRad(70);
const SWAY = 0.07;
const EDGE_IDLE = new THREE.Color('#5d7f9e');
const EDGE_ACTIVE = new THREE.Color('#ffffff');
const FLOW_SECONDS = 1.1;

const layerColor = (id: StackLayerId) => STACK_LAYERS.find((layer) => layer.id === id)!.color;
const edgeKey = (from: string, to: string) => `${from}>${to}`;
const SHELF_LEFT = -NODE_SPAN / 2 - 1.3 - LABEL_ZONE;
const SHELF_RIGHT = NODE_SPAN / 2 + 1.3;

function nodePositions() {
  const positions = new Map<string, THREE.Vector3>();
  for (const layer of STACK_LAYERS) {
    const members = STACK_NODES.filter((node) => node.layer === layer.id);
    const spacing = members.length > 1 ? Math.min(MAX_NODE_SPACING, NODE_SPAN / (members.length - 1)) : 0;
    members.forEach((node, index) => {
      positions.set(node.id, new THREE.Vector3((index - (members.length - 1) / 2) * spacing, LAYER_Y[layer.id], 0));
    });
  }
  return positions;
}

function edgeCurve(from: THREE.Vector3, to: THREE.Vector3, index: number) {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  // Same-layer links arc upward; links between layers bow toward the viewer so they pass in front of the blocks.
  if (from.y === to.y) mid.y += 1;
  else mid.z += 1.3 + (index % 3) * 0.4;
  return new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
}

// Applies the current selection or journey step to the scene objects.
function applyHighlight(state: SceneState, selectedId: string | null, journeyEdges: SceneEdge[] | null, activeEdge: SceneEdge | null) {
  const lit = new Set<string>();
  const involved = new Set<string>();
  if (journeyEdges) {
    for (const edge of journeyEdges) {
      involved.add(edge.from);
      involved.add(edge.to);
    }
  }
  if (activeEdge) {
    lit.add(edgeKey(activeEdge.from, activeEdge.to));
    lit.add(edgeKey(activeEdge.to, activeEdge.from));
  } else if (selectedId) {
    for (const edge of STACK_EDGES) {
      if (edge.from === selectedId || edge.to === selectedId) lit.add(edgeKey(edge.from, edge.to));
    }
  }

  for (const [key, { mesh }] of state.edges) {
    const on = lit.has(key);
    mesh.material.color.copy(on ? EDGE_ACTIVE : EDGE_IDLE);
    mesh.material.opacity = on ? 0.95 : journeyEdges || selectedId ? 0.15 : 0.45;
  }

  const focus = activeEdge ? new Set([activeEdge.from, activeEdge.to]) : null;
  for (const [id, { mesh, label }] of state.nodes) {
    const selected = id === selectedId || Boolean(focus?.has(id));
    const dim = Boolean(journeyEdges) && !involved.has(id) && id !== selectedId;
    mesh.material.emissiveIntensity = selected ? 0.75 : 0.12;
    mesh.material.opacity = dim ? 0.3 : 1;
    mesh.scale.setScalar(selected ? 1.12 : 1);
    label.dataset.state = selected ? 'selected' : dim ? 'dim' : 'idle';
    label.setAttribute('aria-pressed', String(id === selectedId));
  }

  const edge = activeEdge && (state.edges.get(edgeKey(activeEdge.from, activeEdge.to)) ?? state.edges.get(edgeKey(activeEdge.to, activeEdge.from)));
  if (activeEdge && edge) {
    const reverse = !state.edges.has(edgeKey(activeEdge.from, activeEdge.to));
    state.flow = { curve: edge.curve, reverse, startedAt: performance.now() };
    state.particle.visible = true;
  } else {
    state.flow = null;
    state.particle.visible = false;
  }
}

export default function StackScene({ selectedId, journeyEdges, activeEdge, reducedMotion, getInsets, layoutKey, onSelect, onUnavailable }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState | null>(null);
  const onSelectRef = useRef(onSelect);
  const onUnavailableRef = useRef(onUnavailable);
  const getInsetsRef = useRef(getInsets);
  const reducedMotionRef = useRef(reducedMotion);
  // The gentle sway stops for good once the viewer turns the model or picks something.
  const settledRef = useRef(false);
  const initialSelectionRef = useRef(selectedId);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onUnavailableRef.current = onUnavailable;
    getInsetsRef.current = getInsets;
    reducedMotionRef.current = reducedMotion;
  }, [onSelect, onUnavailable, getInsets, reducedMotion]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onUnavailableRef.current();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.className = 'pointer-events-none absolute inset-0';
    container.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    const stack = new THREE.Group();
    scene.add(stack);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
    const target = new THREE.Vector3(0, 0.4, 0);

    scene.add(new THREE.AmbientLight('#ffffff', 1.3));
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
    keyLight.position.set(4, 14, 16);
    scene.add(keyLight);

    const disposables: Array<{ dispose: () => void }> = [];
    const meshes: THREE.Mesh[] = [];
    // Points the default view must keep on screen: shelf corners, layer names and label tops.
    const fitPoints: THREE.Vector3[] = [];
    const flippable: CSS2DObject[] = [];

    for (const layer of STACK_LAYERS) {
      const y = LAYER_Y[layer.id] - 0.36;
      const slabGeometry = new THREE.BoxGeometry(SHELF_RIGHT - SHELF_LEFT, 0.1, PLATFORM_DEPTH);
      const slabMaterial = new THREE.MeshStandardMaterial({ color: layer.color, transparent: true, opacity: 0.12, depthWrite: false });
      const slab = new THREE.Mesh(slabGeometry, slabMaterial);
      slab.position.set((SHELF_LEFT + SHELF_RIGHT) / 2, y, 0);
      stack.add(slab);
      const outlineGeometry = new THREE.EdgesGeometry(slabGeometry);
      const outlineMaterial = new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: 0.6 });
      const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
      outline.position.copy(slab.position);
      stack.add(outline);
      disposables.push(slabGeometry, slabMaterial, outlineGeometry, outlineMaterial);
      for (const x of [SHELF_LEFT, SHELF_RIGHT]) {
        for (const z of [-PLATFORM_DEPTH / 2, PLATFORM_DEPTH / 2]) fitPoints.push(new THREE.Vector3(x, y, z));
      }

      // The layer name sits in its own zone at the left end of the shelf, clear of the node labels.
      const tag = document.createElement('div');
      tag.className = 'rounded-full border border-white/15 bg-[#0f233a]/85 px-[0.7em] py-[0.15em] text-[length:var(--stack-label-size,12px)] font-medium whitespace-nowrap';
      tag.style.color = layer.color;
      tag.textContent = layer.name;
      const layerLabel = new CSS2DObject(tag);
      layerLabel.center.set(0, 0.5);
      layerLabel.position.set(SHELF_LEFT + 0.3, y + 0.35, 0);
      stack.add(layerLabel);
    }

    const positions = nodePositions();
    const nodes: SceneState['nodes'] = new Map();
    for (const node of STACK_NODES) {
      const position = positions.get(node.id)!;
      const color = layerColor(node.layer);
      const geometry = new RoundedBoxGeometry(1.8, 0.6, 1.4, 4, 0.14);
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12, roughness: 0.45, metalness: 0.1, transparent: true });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData.nodeId = node.id;
      stack.add(mesh);
      meshes.push(mesh);
      disposables.push(geometry, material);
      fitPoints.push(position.clone().add(new THREE.Vector3(0, 1.3, 0)));

      const label = document.createElement('button');
      label.type = 'button';
      label.dataset.state = 'idle';
      label.setAttribute('aria-label', `${node.name} (${node.tag})`);
      label.setAttribute('aria-pressed', 'false');
      // Name only: the tag and details live in the side panel, which keeps neighbouring labels apart.
      label.className = 'pointer-events-auto rounded-[0.5em] border border-white/15 bg-[#0b1b2d]/90 px-[0.6em] py-[0.25em] text-[length:var(--stack-label-size,12px)] leading-tight font-semibold whitespace-nowrap text-white shadow-lg transition-[opacity,background-color] outline-none hover:bg-[#13304d] focus-visible:ring-2 focus-visible:ring-white data-[state=dim]:opacity-35 data-[state=selected]:bg-white data-[state=selected]:text-[#0f233a]';
      label.textContent = node.name;
      label.addEventListener('click', () => onSelectRef.current(node.id));
      const labelObject = new CSS2DObject(label);
      // Bottom of the label rests on top of its block.
      labelObject.center.set(0.5, 1);
      labelObject.position.set(0, 0.4, 0);
      mesh.add(labelObject);
      // On a crowded small screen every other label of a full shelf hangs below its block instead.
      const row = STACK_NODES.filter((item) => item.layer === node.layer);
      if (row.length >= 5 && row.indexOf(node) % 2 === 1) flippable.push(labelObject);
      nodes.set(node.id, { mesh, label });
    }

    const edges: SceneState['edges'] = new Map();
    STACK_EDGES.forEach((edge, index) => {
      const curve = edgeCurve(positions.get(edge.from)!, positions.get(edge.to)!, index);
      const geometry = new THREE.TubeGeometry(curve, 48, 0.04, 6, false);
      const material = new THREE.MeshBasicMaterial({ color: EDGE_IDLE, transparent: true, opacity: 0.45, depthWrite: false });
      const mesh = new THREE.Mesh(geometry, material);
      stack.add(mesh);
      disposables.push(geometry, material);
      edges.set(edgeKey(edge.from, edge.to), { mesh, curve });
    });

    const particleGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.visible = false;
    stack.add(particle);
    disposables.push(particleGeometry, particleMaterial);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.enablePan = false;
    // Wheel and one-finger drag keep scrolling the page; turn with a mouse drag or two fingers.
    controls.enableZoom = false;
    controls.touches = { ONE: null, TWO: THREE.TOUCH.ROTATE };
    renderer.domElement.style.touchAction = 'pan-y';
    // Small turns only, so the shelves stay readable from the front.
    controls.minAzimuthAngle = -0.6;
    controls.maxAzimuthAngle = 0.6;
    controls.minPolarAngle = VIEW_POLAR - 0.3;
    controls.maxPolarAngle = VIEW_POLAR + 0.15;
    controls.addEventListener('start', () => { settledRef.current = true; });

    // Place the camera so the model fills the canvas area that the overlays leave free.
    const fit = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
      camera.aspect = width / height;
      camera.clearViewOffset();
      const direction = new THREE.Vector3().setFromSphericalCoords(1, VIEW_POLAR, 0);
      const project = (distance: number) => {
        camera.position.copy(target).addScaledVector(direction, distance);
        camera.lookAt(target);
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        const box = new THREE.Box2();
        for (const point of fitPoints) {
          const projected = point.clone().multiply(stack.scale).project(camera);
          box.expandByPoint(new THREE.Vector2(projected.x, projected.y));
        }
        return box;
      };

      const fitInto = (insets: SceneInsets) => {
        const freeWidth = Math.max(80, width - insets.left - insets.right);
        const freeHeight = Math.max(80, height - insets.top - insets.bottom);
        let distance = 40;
        let box = project(distance);
        // Projected size shrinks roughly with distance, so a few passes converge.
        for (let pass = 0; pass < 3; pass += 1) {
          const size = box.getSize(new THREE.Vector2());
          distance *= Math.max(size.x / ((2 * freeWidth) / width), size.y / ((2 * freeHeight) / height)) * 1.03;
          box = project(distance);
        }
        return { distance, box: box.clone(), insets, freeWidth, freeHeight };
      };

      stack.scale.y = 1;
      let best: ReturnType<typeof fitInto> | null = null;
      for (const insets of getInsetsRef.current()) {
        const candidate = fitInto(insets);
        if (!best || candidate.distance < best.distance) best = candidate;
      }
      if (!best) return;
      // A tall free area (phones) leaves height unused once the width is filled: spread the shelves apart to use it.
      const used = best.box.getSize(new THREE.Vector2());
      const spare = (best.freeHeight / ((used.y * height) / 2)) / (best.freeWidth / ((used.x * width) / 2));
      if (spare > 1.05) {
        stack.scale.y = Math.min(1.8, spare * 0.95);
        best = fitInto(best.insets);
      }

      project(best.distance);
      const { insets, box, freeWidth, freeHeight } = best;
      const center = box.getCenter(new THREE.Vector2());
      const wantX = ((insets.left + freeWidth / 2) / width) * 2 - 1;
      const wantY = 1 - ((insets.top + freeHeight / 2) / height) * 2;
      // Shift the rendered view so the model's centre lands in the middle of the free area.
      camera.setViewOffset(width, height, -((wantX - center.x) * width) / 2, ((wantY - center.y) * height) / 2, width, height);
      camera.updateProjectionMatrix();
      // Size the labels to the model: the busiest shelf (five short names) must not overlap.
      const unit = new THREE.Vector3(1, 0, 0).project(camera).x - new THREE.Vector3(0, 0, 0).project(camera).x;
      const pixelsPerUnit = (unit * width) / 2;
      const idealSize = (3 * pixelsPerUnit - 12) / 4.2;
      container.style.setProperty('--stack-label-size', `${THREE.MathUtils.clamp(idealSize, 10, 14).toFixed(1)}px`);
      const crowded = idealSize < 11;
      for (const labelObject of flippable) {
        labelObject.center.set(0.5, crowded ? 0 : 1);
        labelObject.position.y = crowded ? -0.35 : 0.4;
      }
    };

    stateRef.current = { nodes, edges, particle, fit, flow: null };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt: { x: number; y: number } | null = null;
    const pick = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(meshes, false)[0]?.object.userData.nodeId as string | undefined;
    };
    const onPointerDown = (event: PointerEvent) => { downAt = { x: event.clientX, y: event.clientY }; };
    const onPointerUp = (event: PointerEvent) => {
      // A drag turns the model; only a click selects.
      if (!downAt || Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 6) return;
      const id = pick(event);
      if (id) onSelectRef.current(id);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') renderer.domElement.style.cursor = pick(event) ? 'pointer' : 'grab';
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(container);
    fit();

    // Draw only while the model is on screen and the tab is visible.
    let onScreen = true;
    const visibility = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; });
    visibility.observe(container);

    let frame = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!onScreen || document.hidden) return;
      const state = stateRef.current;
      if (state?.flow) {
        const progress = reducedMotionRef.current ? 1 : Math.min(1, (now - state.flow.startedAt) / (FLOW_SECONDS * 1000));
        state.particle.position.copy(state.flow.curve.getPoint(state.flow.reverse ? 1 - progress : progress));
      }
      const swaying = !settledRef.current && !reducedMotionRef.current;
      stack.rotation.y = swaying ? Math.sin(now / 2600) * SWAY : stack.rotation.y * 0.92;
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      controls.dispose();
      for (const item of disposables) item.dispose();
      renderer.dispose();
      container.replaceChildren();
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (selectedId !== initialSelectionRef.current || journeyEdges) settledRef.current = true;
    if (stateRef.current) applyHighlight(stateRef.current, selectedId, journeyEdges, activeEdge);
  }, [selectedId, journeyEdges, activeEdge]);

  useEffect(() => {
    stateRef.current?.fit();
  }, [layoutKey]);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden" />;
}
