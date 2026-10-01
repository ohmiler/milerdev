export type TagHue = 'orange' | 'violet' | 'amber' | 'teal' | 'pink' | 'green' | 'neutral';

type TagLike = { slug: string; name: string };

// Tags are free-form names set by admins and carry no color of their own.
// Known topics get a stable hue; everything else keeps the neutral badge.
const TOPIC_HUES: ReadonlyArray<readonly [TagHue, readonly string[]]> = [
  ['orange', ['html', 'html5']],
  ['violet', ['css', 'css3', 'sass', 'scss', 'tailwind', 'tailwindcss']],
  ['amber', ['javascript', 'js', 'typescript', 'ts', 'node', 'nodejs']],
  ['teal', ['react', 'reactjs', 'next', 'nextjs', 'vue', 'vuejs']],
  ['pink', ['figma', 'design', 'ui', 'ux']],
  ['green', ['ai', 'agentic', 'llm', 'prompt']],
];

export function getTagHue(tag: TagLike): TagHue {
  const words = `${tag.slug} ${tag.name}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const [hue, topics] of TOPIC_HUES) {
    if (words.some((word) => topics.includes(word))) return hue;
  }
  return 'neutral';
}
