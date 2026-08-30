'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
}

export default function AffiliateBannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/affiliate-banners', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load affiliate banners');
        return response.json();
      })
      .then((data) => {
        setBanners(Array.isArray(data.banners) ? data.banners : []);
      })
      .catch((error: unknown) => {
        const isAbortError = typeof error === 'object'
          && error !== null
          && 'name' in error
          && error.name === 'AbortError';

        if (!isAbortError) setBanners([]);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(media.matches);

    syncPreference();
    media.addEventListener('change', syncPreference);
    return () => media.removeEventListener('change', syncPreference);
  }, []);

  useEffect(() => {
    if (!api) return;

    const syncCurrent = () => setCurrent(api.selectedScrollSnap());
    syncCurrent();
    api.on('select', syncCurrent);
    api.on('reInit', syncCurrent);

    return () => {
      api.off('select', syncCurrent);
      api.off('reInit', syncCurrent);
    };
  }, [api]);

  useEffect(() => {
    if (!api || isPaused || prefersReducedMotion || banners.length <= 1) return;

    const timer = window.setInterval(() => api.scrollNext(), 4000);
    return () => window.clearInterval(timer);
  }, [api, banners.length, isPaused, prefersReducedMotion]);

  if (banners.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-20 sm:py-28" aria-labelledby="affiliate-carousel-title">
      <div className="container">
        <header className="mb-10 grid items-end gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(20rem,.6fr)] lg:gap-16">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-primary">เครื่องมือและบริการที่เราใช้อยู่</p>
            <h2 id="affiliate-carousel-title" className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              เครื่องมือและบริการที่เราเลือกใช้
            </h2>
          </div>
          <p className="max-w-2xl leading-7 text-muted-foreground">
            ลิงก์บางรายการเป็น affiliate link ซึ่งอาจทำให้ MilerDev ได้รับค่าตอบแทน โดยไม่มีค่าใช้จ่ายเพิ่มสำหรับคุณ
          </p>
        </header>

        <Carousel
          setApi={setApi}
          opts={{ loop: true, duration: prefersReducedMotion ? 0 : 25 }}
          className="mx-auto max-w-6xl px-10"
          aria-labelledby="affiliate-carousel-title"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
          }}
        >
          <CarouselContent className="ml-0">
            {banners.map((banner) => (
              <CarouselItem key={banner.id} className="pl-0">
                <a
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-4/3 overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:aspect-16/5"
                  aria-label={`${banner.title} เปิดในแท็บใหม่`}
                >
                  <span className="absolute inset-0 flex flex-col items-start justify-center gap-2 p-7 sm:p-14">
                    <span className="text-sm font-medium text-muted-foreground">เครื่องมือที่ MilerDev เลือกใช้</span>
                    <strong className="max-w-2xl text-2xl sm:text-4xl">{banner.title}</strong>
                    <span className="text-sm font-medium text-primary">เปิดรายละเอียดในแท็บใหม่ →</span>
                  </span>
                  {!failedImages[banner.id] ? (
                    <Image
                      src={banner.imageUrl}
                      alt={banner.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 1180px"
                      unoptimized
                      draggable={false}
                      className="object-cover"
                      onError={() => setFailedImages((status) => ({ ...status, [banner.id]: true }))}
                    />
                  ) : null}
                </a>
              </CarouselItem>
            ))}
          </CarouselContent>

          {banners.length > 1 ? (
            <>
              <CarouselPrevious className="left-3" aria-label="ดูรายการก่อนหน้า" />
              <CarouselNext className="right-3" aria-label="ดูรายการถัดไป" />
            </>
          ) : null}
        </Carousel>

        {banners.length > 1 ? (
          <div className="mt-4 flex justify-center gap-1" aria-label="เลือกรายการแนะนำ">
            {banners.map((banner, index) => (
              <Button
                key={banner.id}
                type="button"
                variant={current === index ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => api?.scrollTo(index)}
                aria-label={`ดูรายการที่ ${index + 1}`}
                aria-pressed={current === index}
              >
                <Circle data-icon="inline-start" fill={current === index ? 'currentColor' : 'none'} aria-hidden="true" />
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
