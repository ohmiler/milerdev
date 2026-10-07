import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { FacebookIcon, YouTubeIcon } from '@/components/content/SocialIcons';
import SectionHeader from '@/components/layout/SectionHeader';
import { Button } from '@/components/ui/button';

const STUDIO_IMAGES = [
  {
    src: '/showcase/01-showcase-1024x768.webp',
    alt: 'MilerDev แบ่งปันประสบการณ์ด้านการพัฒนาซอฟต์แวร์บนเวที',
  },
  {
    src: '/showcase/02-showcase-1024x768.webp',
    alt: 'ผู้เรียนฟังการบรรยายในเวิร์กช็อปการเขียนโปรแกรมของ MilerDev',
  },
  {
    src: '/showcase/09-showcase-1024x768.webp',
    alt: 'เบื้องหลังการถ่ายทำบทเรียนในสตูดิโอ MilerDev',
  },
] as const;

const INSTRUCTOR = {
  name: 'ปฏิภาณ เพ็งเภา',
  role: 'ผู้ก่อตั้งและผู้สอน MilerDev',
  // From the public YouTube channel on 2026-10-07: 196K subscribers and 3.7K videos. Rounded down
  // so the claim stays true as the channel grows; recheck the channel before changing the numbers.
  bio: 'สอนเขียนโปรแกรมภาษาไทยผ่านช่อง YouTube MilerDev ที่มีผู้ติดตามกว่า 190,000 คน และวิดีโอกว่า 3,700 คลิป คอร์สใน MilerDev คือการจัดลำดับความรู้เหล่านั้นให้เรียนต่อเนื่องจนสร้างงานได้จริง',
  photo: '/showcase/07-showcase-1024x768.webp',
  youtube: 'https://www.youtube.com/@MilerDev',
  facebook: 'https://www.facebook.com/milerdevpro',
} as const;

const instructorLinkClass = 'inline-flex items-center gap-1.5 font-medium text-link-inverse underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40';

export default function StudioProofSection() {
  return (
    <section data-home-section="studio-proof"
      className="bg-navy py-16 text-background sm:py-20 lg:py-24"
      aria-labelledby="studio-proof-title"
    >
      <div className="container grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <figure className="m-0 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {STUDIO_IMAGES.map((image, index) => (
              <div
                key={image.src}
                className={index === 0
                  ? 'relative row-span-2 min-h-64 overflow-hidden rounded-2xl bg-navy-raised'
                  : 'relative aspect-[4/3] overflow-hidden rounded-2xl bg-navy-raised'}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 28vw, 50vw"
                  className={index === 0 ? 'object-cover object-[50%_30%]' : 'object-cover'}
                />
              </div>
            ))}
          </div>
          <figcaption className="text-sm text-background/75">
            ภาพจริงจากเวทีบรรยาย เวิร์กช็อป และสตูดิโอถ่ายทำบทเรียน
          </figcaption>
        </figure>

        <div className="flex flex-col items-start gap-6">
          <SectionHeader
            id="studio-proof-title"
            tone="inverse"
            eyebrow="ผู้สอน"
            title="สอนจากประสบการณ์จริง แล้วอธิบายให้คนเริ่มต้นเห็นภาพ"
            description="MilerDev นำประสบการณ์จากการพัฒนาเว็บไซต์ การสอน และการเป็นวิทยากร มาจัดลำดับเป็นบทเรียนภาษาไทยที่เริ่มจากเหตุผล ก่อนพาไปลงมือสร้างด้วยตัวเอง"
          />

          <div className="flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-navy-raised p-4">
            {/* The name sits beside the photo, so the photo itself is decorative. */}
            <Image
              src={INSTRUCTOR.photo}
              alt=""
              width={128}
              height={128}
              sizes="64px"
              className="size-16 shrink-0 rounded-full object-cover object-[50%_28%]"
            />
            <div className="min-w-0">
              <h3 className="text-lead font-semibold">{INSTRUCTOR.name}</h3>
              <p className="text-sm text-background/75">{INSTRUCTOR.role}</p>
              <p className="mt-2 text-sm leading-6 text-background/75">{INSTRUCTOR.bio}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a href={INSTRUCTOR.youtube} target="_blank" rel="noopener noreferrer" className={instructorLinkClass}>
                  <YouTubeIcon />ช่อง YouTube
                </a>
                <a href={INSTRUCTOR.facebook} target="_blank" rel="noopener noreferrer" className={instructorLinkClass}>
                  <FacebookIcon />เพจ Facebook
                </a>
              </p>
            </div>
          </div>

          <Button asChild size="lg" variant="secondary">
            <Link href="/about">
              รู้จัก MilerDev
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
