export type BundleCourseStatus = 'draft' | 'published' | 'archived';

export type BundleCourseStatusRecord = {
  id: string;
  status: BundleCourseStatus;
};

export type BundleCommerceErrorCode =
  | 'BUNDLE_HAS_NO_COURSES'
  | 'BUNDLE_CHILD_NOT_PUBLISHED';

export class BundleCommerceError extends Error {
  constructor(
    readonly code: BundleCommerceErrorCode,
    readonly blockingCourseIds: string[] = [],
  ) {
    super(code);
    this.name = 'BundleCommerceError';
  }
}

export function requirePublishedBundleCourses(
  rows: BundleCourseStatusRecord[],
): string[] {
  if (rows.length === 0) {
    throw new BundleCommerceError('BUNDLE_HAS_NO_COURSES');
  }

  const blockingCourseIds = rows
    .filter((course) => course.status !== 'published')
    .map((course) => course.id)
    .sort();

  if (blockingCourseIds.length > 0) {
    throw new BundleCommerceError(
      'BUNDLE_CHILD_NOT_PUBLISHED',
      blockingCourseIds,
    );
  }

  return rows.map((course) => course.id).sort();
}
