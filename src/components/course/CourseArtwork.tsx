import { cn } from '@/lib/utils';

interface CourseArtworkProps {
  title: string;
  slug: string;
  tags?: Array<{ name: string }>;
  // For narrow spots such as Bundle course rows: no tags, smaller title.
  compact?: boolean;
}

const ARTWORK_THEMES = [
  {
    surface: 'bg-[radial-gradient(circle_at_82%_18%,rgba(56,189,248,.4),transparent_30%),linear-gradient(145deg,#071a33_0%,#0b2d4f_56%,#075985_100%)]',
    accent: 'bg-cyan-300',
  },
  {
    surface: 'bg-[radial-gradient(circle_at_78%_12%,rgba(129,140,248,.42),transparent_32%),linear-gradient(145deg,#111827_0%,#172554_52%,#312e81_100%)]',
    accent: 'bg-indigo-300',
  },
  {
    surface: 'bg-[radial-gradient(circle_at_84%_16%,rgba(45,212,191,.36),transparent_31%),linear-gradient(145deg,#082f49_0%,#164e63_52%,#115e59_100%)]',
    accent: 'bg-teal-300',
  },
  {
    surface: 'bg-[radial-gradient(circle_at_80%_18%,rgba(52,211,153,.34),transparent_31%),linear-gradient(145deg,#102a2c_0%,#163c3a_52%,#166534_100%)]',
    accent: 'bg-emerald-300',
  },
] as const;

function hashCourseSlug(slug: string): number {
  return Array.from(slug).reduce((hash, character) => {
    return Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }, 2166136261);
}

export default function CourseArtwork({ title, slug, tags, compact = false }: CourseArtworkProps) {
  const artworkIndex = hashCourseSlug(slug) % ARTWORK_THEMES.length;
  const theme = ARTWORK_THEMES[artworkIndex];
  const artworkNumber = String((hashCourseSlug(slug) % 24) + 1).padStart(2, '0');

  return (
    // Fills its parent, which sets the size: a long title is clamped instead of stretching the cover.
    <div className={cn('relative flex size-full flex-col overflow-hidden text-white', compact ? 'justify-end p-4' : 'justify-between p-5 sm:p-6', theme.surface)} aria-hidden="true">
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.28)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.28)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom_right,black,transparent_72%)]" />
      <div className="absolute -right-12 -bottom-20 size-52 rounded-full border border-white/15" />
      <div className="absolute -right-4 -bottom-12 size-32 rounded-full border border-white/15" />

      {/* The top-left corner stays empty: course cards and Bundle rows put their own badges there. */}
      {compact ? null : (
        <div className="relative flex justify-end text-[0.68rem] font-semibold">
          <span className="font-mono tracking-[0.16em] text-white/55">MD—{artworkNumber}</span>
        </div>
      )}

      <div className="relative min-w-0">
        {compact ? null : (
          <div className="mb-3 flex flex-wrap gap-2 sm:mb-4">
            {(tags?.length ? tags.slice(0, 2) : [{ name: 'คอร์สออนไลน์ภาษาไทย' }]).map((tag) => (
              <span key={tag.name} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[0.68rem] font-medium text-white/80 backdrop-blur-sm">
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <strong className={cn('line-clamp-2 max-w-[16rem] leading-tight tracking-[-.025em] text-balance', compact ? 'text-base' : 'text-xl sm:text-2xl')}>{title}</strong>
        <span className={cn('block h-1 w-12 rounded-full', compact ? 'mt-3' : 'mt-4 sm:mt-5', theme.accent)} />
      </div>
    </div>
  );
}
