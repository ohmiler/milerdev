import type { InstructorProfileLink } from '@/lib/db/schema';

export interface CourseInstructor {
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  profileLinks: InstructorProfileLink[] | null;
}

// Links come from admin input; render only https, as the admin form requires.
const safeLinks = (links: InstructorProfileLink[] | null) => (links ?? []).filter((link) => {
  try {
    return new URL(link.url).protocol === 'https:';
  } catch {
    return false;
  }
});

/** The course's real instructor, with the profile an admin wrote on their user page. */
export default function CourseInstructorCard({ instructor }: { instructor: CourseInstructor }) {
  const links = safeLinks(instructor.profileLinks);

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-navy p-6 text-background sm:flex-row sm:items-start sm:p-8">
      {instructor.avatarUrl ? (
        // The name sits beside the photo, so the photo itself is decorative.
        <img src={instructor.avatarUrl} alt="" width={112} height={112} className="size-24 shrink-0 rounded-full object-cover sm:size-28" />
      ) : (
        <span className="grid size-24 shrink-0 place-items-center rounded-full bg-navy-raised text-3xl font-bold sm:size-28" aria-hidden="true">{instructor.name.charAt(0)}</span>
      )}
      <div className="grid min-w-0 gap-2">
        <h3 className="text-h3 font-bold wrap-anywhere">{instructor.name}</h3>
        <p className="text-sm text-background/75">{instructor.headline ?? 'ผู้สอนและดูแลเนื้อหาคอร์สนี้'}</p>
        {instructor.bio ? <p className="mt-1 max-w-2xl leading-7 whitespace-pre-line text-background/90">{instructor.bio}</p> : null}
        {links.length > 0 ? (
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {links.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link-inverse underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                {link.label}
              </a>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}
