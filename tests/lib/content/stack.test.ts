import { describe, expect, it } from 'vitest';

import { isStackEdge, STACK_EDGES, STACK_JOURNEYS, STACK_LAYERS, STACK_NODES, stackNeighbors } from '@/lib/content/stack';

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

  it('does not publish secrets, environment names, or internal endpoints', () => {
    const text = JSON.stringify([STACK_LAYERS, STACK_NODES, STACK_EDGES, STACK_JOURNEYS]);
    expect(text).not.toMatch(/[A-Z][A-Z0-9]*_[A-Z0-9_]+/);
    expect(text).not.toMatch(/\/api\/|https?:\/\/|sk_|whsec_|mysql:\/\//i);
  });
});
