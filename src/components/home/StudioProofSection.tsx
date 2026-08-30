import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Presentation } from 'lucide-react';

import { Button } from '@/components/ui/button';

const STUDIO_IMAGES = [
  {
    src: '/showcase/01-showcase-1024x768.webp',
    alt: 'MilerDev แบ่งปันประสบการณ์ด้านการพัฒนาซอฟต์แวร์บนเวที',
    label: 'เวทีแบ่งปันประสบการณ์',
  },
  {
    src: '/showcase/05-showcase-1024x768.webp',
    alt: 'บรรยากาศการสอนและเวิร์กช็อปของ MilerDev',
    label: 'เวิร์กช็อปและห้องเรียน',
  },
  {
    src: '/showcase/09-showcase-1024x768.webp',
    alt: 'MilerDev เป็นวิทยากรเรื่องการเขียนโปรแกรมและการพัฒนาเว็บไซต์',
    label: 'จากงานจริงสู่บทเรียน',
  },
] as const;

export default function StudioProofSection() {
  return (
    <section data-home-section="studio-proof"
      className="bg-foreground py-16 text-background sm:py-20 lg:py-24"
      aria-labelledby="studio-proof-title"
    >
      <div className="container grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-background/75">
            <Presentation className="size-4" aria-hidden="true" />
            MilerDev Studio
          </div>
          <h2
            id="studio-proof-title"
            className="mt-4 text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl"
          >
            สอนจากประสบการณ์จริง แล้วอธิบายให้คนเริ่มต้นเห็นภาพ
          </h2>
          <p className="mt-5 text-pretty leading-8 text-background/75">
            MilerDev นำประสบการณ์จากการพัฒนาเว็บไซต์ การสอน และการเป็นวิทยากร
            มาจัดลำดับเป็นบทเรียนภาษาไทยที่เริ่มจากเหตุผล ก่อนพาไปลงมือสร้างด้วยตัวเอง
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-8"
          >
            <Link href="/about">
              รู้จักแนวทางของ MilerDev
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5" aria-label="ภาพบรรยากาศการสอนจริงของ MilerDev">
          {STUDIO_IMAGES.map((image, index) => (
            <figure
              key={image.src}
              className={index === 0 ? 'group col-span-2 sm:col-span-1 sm:row-span-2' : 'group'}
            >
              <div
                className={[
                  'relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900',
                  index === 0 ? 'aspect-[16/10] h-full min-h-64 sm:aspect-auto' : 'aspect-[4/3]',
                ].join(' ')}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes={index === 0 ? '(max-width: 640px) 100vw, 34vw' : '(max-width: 640px) 50vw, 24vw'}
                  className="object-cover transition duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-4 pt-12 pb-4">
                  <figcaption className="text-sm font-semibold text-white">{image.label}</figcaption>
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
