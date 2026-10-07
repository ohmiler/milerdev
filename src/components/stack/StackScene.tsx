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
  // Nodes the guided tour is pointing at; everything else is dimmed.
  focusIds: string[] | null;
  reducedMotion: boolean;
  // Ways to keep clear of the overlays (title, panel), in CSS pixels; the fit that gives the largest model wins.
  getInsets: () => SceneInsets[];
  layoutKey: number;
  onSelect: (id: string) => void;
  onUnavailable: () => void;
};

type Highlight = Pick<Props, 'selectedId' | 'journeyEdges' | 'activeEdge' | 'focusIds'> & { hoveredId: string | null };

type EdgeEntry = { mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>; curve: THREE.QuadraticBezierCurve3; label: string };

type AmbientDot = { mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>; edge: EdgeEntry | null; reverse: boolean; startsAt: number };

type SceneState = {
  nodes: Map<string, { mesh: THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial>; label: HTMLButtonElement }>;
  edges: Map<string, EdgeEntry>;
  particle: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  flowTag: CSS2DObject;
  ambient: AmbientDot[];
  highlight: Highlight;
  fit: () => void;
  flow: { curve: THREE.QuadraticBezierCurve3; reverse: boolean; startedAt: number } | null;
  // Frames are drawn only when something changed or is moving.
  needsRender: boolean;
  lastActivity: number;
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
// Small dots keep travelling along the links while someone is looking, then stop to save battery.
const AMBIENT_DOTS = 4;
const AMBIENT_SECONDS = 1.8;
const AMBIENT_IDLE_MS = 30_000;

const layerColor = (id: StackLayerId) => STACK_LAYERS.find((layer) => layer.id === id)!.color;
const edgeKey = (from: string, to: string) => `${from}>${to}`;
const touches = (id: string) => STACK_EDGES.filter((edge) => edge.from === id || edge.to === id).map((edge) => edgeKey(edge.from, edge.to));
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

// Applies the selection, hover, tour stop or journey step to the scene objects.
function applyHighlight(state: SceneState, highlight: Highlight) {
  state.highlight = highlight;
  const { selectedId, hoveredId, focusIds, journeyEdges, activeEdge } = highlight;
  const involved = journeyEdges ? new Set(journeyEdges.flatMap((edge) => [edge.from, edge.to])) : focusIds ? new Set(focusIds) : null;
  const focus = activeEdge ? new Set([activeEdge.from, activeEdge.to]) : focusIds ? new Set(focusIds) : null;

  const lit = new Set<string>();
  if (activeEdge) {
    lit.add(edgeKey(activeEdge.from, activeEdge.to));
    lit.add(edgeKey(activeEdge.to, activeEdge.from));
  } else if (focusIds) {
    for (const edge of STACK_EDGES) if (focus?.has(edge.from) && focus.has(edge.to)) lit.add(edgeKey(edge.from, edge.to));
  } else if (selectedId) {
    for (const key of touches(selectedId)) lit.add(key);
  }
  if (hoveredId && !activeEdge) for (const key of touches(hoveredId)) lit.add(key);

  const quiet = Boolean(involved || selectedId || hoveredId);
  for (const [key, { mesh }] of state.edges) {
    const on = lit.has(key);
    mesh.material.color.copy(on ? EDGE_ACTIVE : EDGE_IDLE);
    mesh.material.opacity = on ? 0.95 : quiet ? 0.15 : 0.45;
  }

  for (const [id, { mesh, label }] of state.nodes) {
    const selected = id === selectedId || Boolean(focus?.has(id));
    const hovered = id === hoveredId;
    const dim = Boolean(involved) && !involved?.has(id) && id !== selectedId;
    mesh.material.emissiveIntensity = selected ? 0.75 : hovered ? 0.45 : 0.12;
    mesh.material.opacity = dim ? 0.3 : 1;
    mesh.scale.setScalar(selected ? 1.12 : hovered ? 1.06 : 1);
    label.dataset.state = selected ? 'selected' : dim ? 'dim' : 'idle';
    label.setAttribute('aria-pressed', String(id === selectedId));
  }

  const forward = activeEdge ? state.edges.get(edgeKey(activeEdge.from, activeEdge.to)) : undefined;
  const edge = forward ?? (activeEdge ? state.edges.get(edgeKey(activeEdge.to, activeEdge.from)) : undefined);
  if (activeEdge && edge) {
    if (state.flow?.curve !== edge.curve || state.flow.reverse !== !forward) {
      state.flow = { curve: edge.curve, reverse: !forward, startedAt: performance.now() };
    }
    state.particle.visible = true;
    state.flowTag.element.textContent = edge.label;
    state.flowTag.position.copy(edge.curve.getPoint(0.5));
    state.flowTag.visible = true;
  } else {
    state.flow = null;
    state.particle.visible = false;
    state.flowTag.visible = false;
  }
  state.needsRender = true;
}

export default function StackScene({ selectedId, journeyEdges, activeEdge, focusIds, reducedMotion, getInsets, layoutKey, onSelect, onUnavailable }: Props) {
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
    if (stateRef.current) stateRef.current.needsRender = true;
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
    // Points the default view must keep on screen: shelf corners and label tops.
    const fitPoints: THREE.Vector3[] = [];
    const flippable: CSS2DObject[] = [];
    let hoveredId: string | null = null;
    const setHovered = (id: string | null) => {
      if (id === hoveredId || !stateRef.current) return;
      hoveredId = id;
      applyHighlight(stateRef.current, { ...stateRef.current.highlight, hoveredId: id });
    };

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
      tag.className = 'rounded-full border border-white/15 bg-navy/85 px-[0.7em] py-[0.15em] text-[length:var(--stack-label-size,12px)] font-medium whitespace-nowrap';
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
      label.className = 'pointer-events-auto rounded-[0.5em] border border-white/15 bg-navy/90 px-[0.6em] py-[0.25em] text-[length:var(--stack-label-size,12px)] leading-tight font-semibold whitespace-nowrap text-white shadow-lg transition-[opacity,background-color] outline-none hover:bg-navy-raised focus-visible:ring-2 focus-visible:ring-white data-[state=dim]:opacity-35 data-[state=selected]:bg-white data-[state=selected]:text-navy';
      label.textContent = node.name;
      label.addEventListener('click', () => onSelectRef.current(node.id));
      label.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') setHovered(node.id); });
      label.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') setHovered(null); });
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
      edges.set(edgeKey(edge.from, edge.to), { mesh, curve, label: edge.label });
    });

    const particleGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.visible = false;
    stack.add(particle);
    disposables.push(particleGeometry, particleMaterial);

    // What the current journey step does, written on its link.
    const flowTagElement = document.createElement('div');
    flowTagElement.className = 'rounded-full bg-link-inverse px-[0.7em] py-[0.2em] text-[length:var(--stack-label-size,12px)] font-semibold whitespace-nowrap text-navy shadow-lg';
    const flowTag = new CSS2DObject(flowTagElement);
    flowTag.visible = false;
    stack.add(flowTag);

    const ambientGeometry = new THREE.SphereGeometry(0.09, 10, 10);
    const ambientMaterial = new THREE.MeshBasicMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.85 });
    disposables.push(ambientGeometry, ambientMaterial);
    const ambient: AmbientDot[] = Array.from({ length: AMBIENT_DOTS }, (_, index) => {
      const mesh = new THREE.Mesh(ambientGeometry, ambientMaterial);
      mesh.visible = false;
      stack.add(mesh);
      return { mesh, edge: null, reverse: false, startsAt: performance.now() + index * 450 };
    });

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
      if (stateRef.current) stateRef.current.needsRender = true;
    };

    stateRef.current = {
      nodes, edges, particle, flowTag, ambient, fit, flow: null,
      highlight: { selectedId: null, hoveredId: null, focusIds: null, journeyEdges: null, activeEdge: null },
      needsRender: true,
      lastActivity: performance.now(),
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt: { x: number; y: number } | null = null;
    const pick = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(meshes, false)[0]?.object.userData.nodeId as string | undefined;
    };
    const wake = () => { if (stateRef.current) stateRef.current.lastActivity = performance.now(); };
    const onPointerDown = (event: PointerEvent) => { downAt = { x: event.clientX, y: event.clientY }; };
    const onPointerUp = (event: PointerEvent) => {
      // A drag turns the model; only a click selects.
      if (!downAt || Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 6) return;
      const id = pick(event);
      if (id) onSelectRef.current(id);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const id = pick(event) ?? null;
      renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
      setHovered(id);
    };
    const onPointerLeave = () => setHovered(null);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('pointermove', wake);
    container.addEventListener('pointerdown', wake);

    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(container);
    fit();

    // Draw only while the model is on screen and the tab is visible.
    let onScreen = true;
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) wake();
    });
    visibility.observe(container);

    const edgeList = [...edges.values()];
    const ambientEdges = (state: SceneState) => {
      const { selectedId: selected } = state.highlight;
      if (!selected) return edgeList;
      const keys = touches(selected);
      return keys.map((key) => edges.get(key)!);
    };

    let frame = 0;
    let tickCount = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const state = stateRef.current;
      if (!state || !onScreen || document.hidden) return;
      tickCount += 1;
      let dirty = state.needsRender;
      state.needsRender = false;
      const reduced = reducedMotionRef.current;

      if (state.flow) {
        const elapsed = (now - state.flow.startedAt) / (FLOW_SECONDS * 1000);
        const progress = reduced ? 1 : Math.min(1, elapsed);
        state.particle.position.copy(state.flow.curve.getPoint(state.flow.reverse ? 1 - progress : progress));
        if (elapsed < 1.1) dirty = true;
      }

      if (!settledRef.current && !reduced) {
        stack.rotation.y = Math.sin(now / 2600) * SWAY;
        dirty = true;
      } else if (Math.abs(stack.rotation.y) > 0.0005) {
        stack.rotation.y *= 0.92;
        dirty = true;
      }

      const { journeyEdges: journey, focusIds: focus } = state.highlight;
      const ambientOn = !reduced && !journey && !focus && now - state.lastActivity < AMBIENT_IDLE_MS;
      let ambientMoving = false;
      for (const dot of state.ambient) {
        if (!ambientOn) {
          if (dot.mesh.visible) { dot.mesh.visible = false; dirty = true; }
          continue;
        }
        if (!dot.edge || now - dot.startsAt > AMBIENT_SECONDS * 1000) {
          const pool = ambientEdges(state);
          dot.edge = pool[Math.floor(Math.random() * pool.length)] ?? null;
          dot.reverse = Math.random() < 0.5;
          dot.startsAt = now + Math.random() * 1200;
        }
        const progress = (now - dot.startsAt) / (AMBIENT_SECONDS * 1000);
        const visible = Boolean(dot.edge) && progress >= 0 && progress <= 1;
        if (visible && dot.edge) dot.mesh.position.copy(dot.edge.curve.getPoint(dot.reverse ? 1 - progress : progress));
        if (visible || dot.mesh.visible) ambientMoving = true;
        dot.mesh.visible = visible;
      }
      // The background flow is drawn at half rate; everything else at full rate.
      if (ambientMoving && tickCount % 2 === 0) dirty = true;

      if (controls.update()) dirty = true;
      if (!dirty) return;
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
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointermove', wake);
      container.removeEventListener('pointerdown', wake);
      controls.dispose();
      for (const item of disposables) item.dispose();
      renderer.dispose();
      container.replaceChildren();
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (selectedId !== initialSelectionRef.current || journeyEdges || focusIds) settledRef.current = true;
    const state = stateRef.current;
    if (!state) return;
    state.lastActivity = performance.now();
    applyHighlight(state, { selectedId, journeyEdges, activeEdge, focusIds, hoveredId: state.highlight.hoveredId });
  }, [selectedId, journeyEdges, activeEdge, focusIds]);

  useEffect(() => {
    stateRef.current?.fit();
  }, [layoutKey]);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden" />;
}
