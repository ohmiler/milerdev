import { describe, expect, it } from 'vitest';

import {
  isStackEdge,
  parseStackView,
  STACK_EDGES,
  STACK_JOURNEYS,
  STACK_LAYERS,
  STACK_NODES,
  STACK_TOUR,
  STACK_TOUR_FINALE,
  stackNeighbors,
  stackViewQuery,
} from '@/lib/content/stack';

const nodeIds = new Set(STACK_NODES.map((node) => node.id));

describe('/stack page content', () => {
  it('gives every node a unique id and an existing layer, and every layer a node', () => {
    expect(nodeIds.size).toBe(STACK_NODES.length);
    const layerIds = new Set(STACK_LAYERS.map((layer) => layer.id));
    for (const node of STACK_NODES) expect(layerIds).toContain(node.layer);
    for (const layer of STACK_LAYERS) expect(STACK_NODES.some((node) => node.layer === layer.id)).toBe(true);
  });

  it('connects only known nodes, once per pair', () => {
    const pairs = new Set<string>();
    for (const edge of STACK_EDGES) {
      expect(nodeIds).toContain(edge.from);
      expect(nodeIds).toContain(edge.to);
      const pair = [edge.from, edge.to].sort().join('|');
      expect(pairs).not.toContain(pair);
      pairs.add(pair);
    }
  });

  it('walks every journey step along a drawn connection, so the model can animate it', () => {
    for (const journey of STACK_JOURNEYS) {
      expect(journey.steps.length).toBeGreaterThan(0);
      for (const step of journey.steps) expect(isStackEdge(step.from, step.to), `${journey.id}: ${step.from} → ${step.to}`).toBe(true);
    }
  });

  it('lists the neighbours of a node from both directions of its connections', () => {
    expect(stackNeighbors('drizzle').map((neighbor) => neighbor.id).sort()).toEqual(['api', 'auth', 'mysql', 'nextjs']);
  });

  it('tours every layer once, top to bottom, and ends on a real journey', () => {
    expect(STACK_TOUR.map((stop) => stop.layer)).toEqual(STACK_LAYERS.map((layer) => layer.id));
    expect(STACK_JOURNEYS.map((journey) => journey.id)).toContain(STACK_TOUR_FINALE);
  });

  it('opens only known parts and journeys from a shared link', () => {
    expect(parseStackView('?part=slipok')).toEqual({ part: 'slipok', flow: null, tour: false });
    expect(parseStackView('?flow=card')).toEqual({ part: null, flow: 'card', tour: false });
    expect(parseStackView('?tour')).toEqual({ part: null, flow: null, tour: true });
    expect(parseStackView('?part=<script>&flow=admin')).toBeNull();
    expect(parseStackView('')).toBeNull();
  });

  it('writes one view per link and round-trips it', () => {
    expect(stackViewQuery({ part: null, flow: null, tour: false })).toBe('');
    expect(stackViewQuery({ part: 'slipok', flow: 'card', tour: false })).toBe('?flow=card');
    for (const query of ['?part=bunny', '?flow=deploy', '?tour']) expect(stackViewQuery(parseStackView(query)!)).toBe(query);
  });

  it('does not publish secrets, environment names, or internal endpoints', () => {
    const text = JSON.stringify([STACK_LAYERS, STACK_NODES, STACK_EDGES, STACK_JOURNEYS, STACK_TOUR]);
    expect(text).not.toMatch(/[A-Z][A-Z0-9]*_[A-Z0-9_]+/);
    expect(text).not.toMatch(/\/api\/|https?:\/\/|sk_|whsec_|mysql:\/\//i);
  });
});
