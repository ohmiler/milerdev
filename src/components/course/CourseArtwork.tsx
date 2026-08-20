interface CourseArtworkProps {
  title: string;
  slug: string;
  tags?: Array<{ name: string }>;
}

const ARTWORK_THEMES = [
  {
    surface: 'bg-[radial-gradient(circle_at_82%_18%,rgba(56,189,248,.4),transparent_30%),linear-gradient(145deg,#071a33_0%,#0b2d4f_56%,#075985_100%)]',
    accent: 'bg-cyan-300',
    muted: 'text-cyan-100/70',
  },
  {
    surface: 'bg-[radial-gradient(circle_at_78%_12%,rgba(129,140,248,.42),transparent_32%),linear-gradient(145deg,#111827_0%,#172554_52%,#312e81_100%)]',
    accent: 'bg-indigo-300',
    muted: 'text-indigo-100/70',
  },
  {
    surface: 'bg-[radial-gradient(circle_at_84%_16%,rgba(45,212,191,.36),transparent_31%),linear-gradient(145deg,#082f49_0%,#164e63_52%,#115e59_100%)]',
    accent: 'bg-teal-300',
    muted: 'text-teal-100/70',
  },
  {
    surface: 'bg-[radial-gradient(circle_at_80%_18%,rgba(52,211,153,.34),transparent_31%),linear-gradient(145deg,#102a2c_0%,#163c3a_52%,#166534_100%)]',
    accent: 'bg-emerald-300',
    muted: 'text-emerald-100/70',
  },
] as const;

function hashCourseSlug(slug: string): number {
  return Array.from(slug).reduce((hash, character) => {
    return Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }, 2166136261);
}

export default function CourseArtwork({ title, slug, tags }: CourseArtworkProps) {
  const artworkIndex = hashCourseSlug(slug) % ARTWORK_THEMES.length;
  const theme = ARTWORK_THEMES[artworkIndex];
  const artworkNumber = String((hashCourseSlug(slug) % 24) + 1).padStart(2, '0');

  return (
    <div className={`relative flex size-full min-h-52 flex-col justify-between overflow-hidden p-6 text-white ${theme.surface}`} aria-hidden="true">
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.28)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.28)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom_right,black,transparent_72%)]" />
      <div className="absolute -right-12 -bottom-20 size-52 rounded-full border border-white/15" />
      <div className="absolute -right-4 -bottom-12 size-32 rounded-full border border-white/15" />

      <div className="relative flex items-center justify-between gap-4 text-[0.68rem] font-semibold tracking-[0.16em] uppercase">
        <span className={theme.muted}>MilerDev Studio</span>
        <span className="font-mono text-white/55">MD—{artworkNumber}</span>
      </div>

      <div className="relative mt-12">
        <div className="mb-4 flex flex-wrap gap-2">
          {(tags?.length ? tags.slice(0, 2) : [{ name: 'คอร์สออนไลน์ภาษาไทย' }]).map((tag) => (
            <span key={tag.name} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[0.68rem] font-medium text-white/80 backdrop-blur-sm">
              {tag.name}
            </span>
          ))}
        </div>
        <strong className="block max-w-[16rem] text-2xl leading-tight tracking-[-.025em] text-balance">{title}</strong>
        <span className={`mt-5 block h-1 w-12 rounded-full ${theme.accent}`} />
      </div>
    </div>
  );
}
