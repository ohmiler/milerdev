import Image, { type ImageProps } from 'next/image';

import type { CoverImage } from '@/lib/courses/cover-image';

type CourseCoverImageProps = Omit<ImageProps, 'src' | 'unoptimized'> & { cover: CoverImage };

/**
 * A course or bundle cover. Uploaded covers can be several megabytes, so covers on an allowed host
 * go through the image optimizer and arrive resized for the screen; any other cover is shown as is.
 */
export default function CourseCoverImage({ cover, alt, ...props }: CourseCoverImageProps) {
  return <Image {...props} alt={alt} src={cover.src} unoptimized={!cover.optimized} />;
}
