import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import CourseArtwork from '@/components/course/CourseArtwork';
import CourseCoverImage from '@/components/course/CourseCoverImage';
import { FacebookIcon, YouTubeIcon } from '@/components/content/SocialIcons';
import Footer from '@/components/layout/Footer';
import MainContent from '@/components/layout/MainContent';
import Navbar from '@/components/layout/Navbar';
import PublicPageHeader from '@/components/layout/PublicPageHeader';
import SectionHeader from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveCoverImage } from '@/lib/courses/cover-image';
import { FOUNDER, STUDIO_PHOTOS } from '@/lib/content/founder';
import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';
import { describePathStep, planHomeCourses } from '@/lib/home/course-plan';
import { getLearningPathCourses } from '@/lib/learning/path-courses';

const DESCRIPTION = 'รู้จัก MilerDev และผู้ก่อตั้ง ที่เรียนเขียนโปรแกรมภาษาไทยที่เน้นลงมือสร้างงานจริง';

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา',
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'เกี่ยวกับ MilerDev',
    description: DESCRIPTION,
    url: '/about',
    siteName: 'MilerDev',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'เกี่ยวกับเรา - MilerDev',
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

// The course path is read from the database on each request, as on Home.
export const dynamic = 'force-dynamic';

const learningMethod = [
  {
    step: '01',
    title: 'เห็นภาพงานก่อนเริ่ม',
    description: 'เริ่มจากสิ่งที่จะสร้างและพื้นฐานที่ต้องใช้ เพื่อให้รู้ว่าแต่ละบทเรียนพาไปถึงไหน',
  },
  {
    step: '02',
    title: 'เข้าใจแล้วเขียนตามลำดับ',
    description: 'อธิบายเหตุผลของแนวคิดและเครื่องมือ ก่อนลงมือเขียนเป็นช่วงที่ทดลองและตรวจสอบได้',
  },
  {
    step: '03',
    title: 'ปิดด้วยสิ่งที่ใช้ต่อได้',
    description: 'จบแต่ละช่วงด้วยโค้ดหรือชิ้นงานที่ตรวจสอบ อธิบาย และนำไปพัฒนาต่อได้',
  },
];

const principles = [
  ['สอนจากงานจริง', 'เลือกเนื้อหาที่เชื่อมกับการสร้างเว็บไซต์และซอฟต์แวร์ที่ใช้งานได้จริง'],
  ['อธิบายให้เห็นภาพ', 'ทำให้แนวคิดทางเทคนิคเข้าใจง่าย โดยไม่ตัดสาระสำคัญทิ้ง'],
  ['วางเส้นทางให้ชัด', 'ผู้เรียนควรรู้ว่ากำลังเรียนอะไร เรียนไปเพื่ออะไร และควรทำอะไรต่อ'],
  ['เรียนต่อได้ไม่เสียจังหวะ', 'บทเรียน ความคืบหน้า และสิ่งที่ควรทำต่อ ช่วยให้กลับมาเรียนต่อได้ทันที'],
];

const founderLinkClass = 'inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium hover:bg-muted';

export default async function AboutPage() {
  const coursePlan = planHomeCourses(await getLearningPathCourses());
  const pathSteps = coursePlan.mode === 'path' ? coursePlan.steps : [];

  return (
    <>
      <Navbar />
      <MainContent className={'bg-[var(--academy-canvas)]'}>
        <PublicPageHeader
          variant={'story'}
          title={'พื้นที่เรียนโค้ดสำหรับคนที่อยากสร้างจริง'}
          description={'MilerDev คือที่เรียนเขียนโปรแกรมภาษาไทย ทุกบทเรียนพาไปเข้าใจแนวคิดผ่านการเขียนโค้ดและสร้างงานด้วยตัวเอง'}
        />

        <section className={'py-14 sm:py-20'} aria-labelledby={'about-founder-title'}>
          <div className={'container grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:gap-16'}>
            <figure className={'m-0'}>
              <Image
                className={'aspect-[4/5] w-full max-w-md rounded-3xl object-cover object-[50%_28%] shadow-[var(--academy-shadow-card)]'}
                src={FOUNDER.photo}
                alt={`${FOUNDER.name} ${FOUNDER.role}`}
                width={1024}
                height={768}
                sizes={'(max-width: 1023px) 100vw, 40vw'}
                preload
              />
            </figure>
            <div className={'flex flex-col gap-6'}>
              <SectionHeader id={'about-founder-title'} eyebrow={'ผู้ก่อตั้ง'} title={FOUNDER.name} description={FOUNDER.role} />
              <div className={'flex max-w-2xl flex-col gap-4 text-base leading-8 text-muted-foreground'}>
                <p>{FOUNDER.bio}</p>
                <p>เป้าหมายไม่ใช่การรวบรวมวิดีโอให้ได้มากที่สุด แต่คือการจัดลำดับความรู้ให้ผู้เรียนเห็นความสัมพันธ์ระหว่างแนวคิด โค้ด และผลลัพธ์ที่เกิดขึ้นจริง</p>
                <p>เมื่อจบบทเรียน ผู้เรียนควรอธิบายสิ่งที่ตัวเองสร้างได้ แก้ปัญหาต่อได้ และรู้ว่าควรพัฒนาทักษะส่วนไหนเป็นลำดับถัดไป</p>
              </div>
              <dl className={'grid max-w-md grid-cols-2 gap-4'}>
                {FOUNDER.channelStats.map((stat) => (
                  <div key={stat.label} className={'rounded-2xl border bg-card p-4'}>
                    <dt className={'text-sm text-muted-foreground'}>{stat.label}</dt>
                    <dd className={'mt-1 text-h3 font-semibold'}>{stat.value}</dd>
                  </div>
                ))}
              </dl>
              <p className={'flex flex-wrap gap-3'}>
                <a href={FOUNDER.youtube} target={'_blank'} rel={'noopener noreferrer'} className={founderLinkClass}><YouTubeIcon />ช่อง YouTube</a>
                <a href={FOUNDER.facebook} target={'_blank'} rel={'noopener noreferrer'} className={founderLinkClass}><FacebookIcon />เพจ Facebook</a>
              </p>
            </div>
          </div>
        </section>

        <section className={'bg-navy py-14 text-background sm:py-20'} aria-labelledby={'about-proof-title'}>
          <div className={'container'}>
            <SectionHeader
              id={'about-proof-title'}
              tone={'inverse'}
              title={'ภาพจากกิจกรรมการสอนและเวทีแบ่งปันความรู้'}
              description={'ภาพจริงจากการบรรยาย เวิร์กช็อป และการถ่ายทำบทเรียน'}
              className={'mb-8'}
            />
            <div className={'grid gap-5 md:grid-cols-3'}>
              {STUDIO_PHOTOS.map((photo) => (
                <figure key={photo.src} className={'overflow-hidden rounded-2xl border border-white/10 bg-white/5'}>
                  <Image
                    className={'aspect-[4/3] w-full object-cover'}
                    src={photo.src}
                    alt={photo.alt}
                    width={1024}
                    height={768}
                    sizes={'(max-width: 767px) 100vw, 33vw'}
                  />
                  <figcaption className={'px-4 py-3 text-caption leading-5 text-background/75'}>{photo.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className={'border-b bg-background py-14 sm:py-20'} aria-labelledby={'about-method-title'}>
          <div className={'container'}>
            <SectionHeader
              id={'about-method-title'}
              title={'เราออกแบบบทเรียนอย่างไร'}
              description={'ทุกช่วงเรียงจากภาพงานและเหตุผล ไปสู่การลงมือเขียน แล้วจบด้วยสิ่งที่ตรวจสอบได้'}
              className={'mb-8'}
            />
            <ol className={'grid gap-5 md:grid-cols-3'}>
              {learningMethod.map((item) => (
                <li key={item.step} className={'min-w-0'}>
                  <Card className={'h-full'}>
                    <CardHeader>
                      <Badge variant={'outline'} className={'w-fit font-mono'}>{item.step}</Badge>
                      <CardTitle className={'text-xl'}>{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={'text-sm leading-7 text-muted-foreground'}>{item.description}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {pathSteps.length > 0 ? (
          <section className={'py-14 sm:py-20'} aria-labelledby={'about-path-title'}>
            <div className={'container'}>
              <SectionHeader
                id={'about-path-title'}
                title={'เส้นทางคอร์สที่แนะนำ'}
                description={'ถ้ายังไม่มีพื้นฐาน เริ่มจากขั้นแรกแล้วเรียนต่อตามลำดับ'}
                className={'mb-8'}
              />
              <ol className={'grid gap-4 md:grid-cols-3'}>
                {pathSteps.map((course, index) => {
                  const cover = resolveCoverImage(course.thumbnailUrl);
                  return (
                    <li key={course.slug} className={'min-w-0'}>
                      <Link href={`/courses/${course.slug}`} className={'group flex h-full flex-col overflow-hidden rounded-2xl border bg-card hover:border-link'}>
                        <div className={'relative aspect-video bg-navy'}>
                          {cover
                            ? <CourseCoverImage cover={cover} alt={''} fill sizes={'(max-width: 767px) 100vw, 33vw'} className={'object-cover'} />
                            : <CourseArtwork title={course.title} slug={course.slug} compact />}
                        </div>
                        <div className={'flex flex-1 flex-col gap-1 p-5'}>
                          <p className={'text-caption font-medium text-link'}>{describePathStep(index, index > 0 ? pathSteps[index - 1].title : null)}</p>
                          <p className={'font-semibold leading-snug group-hover:text-link'}>{course.title}</p>
                          {course.summary ? <p className={'line-clamp-3 text-sm leading-6 text-muted-foreground'}>{course.summary}</p> : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        ) : null}

        <section className={'border-t py-14 sm:py-20'} aria-labelledby={'about-principles-title'}>
          <div className={'container grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-16'}>
            <SectionHeader id={'about-principles-title'} title={'หลักที่ใช้ตัดสินใจ ทุกบทเรียน'} />
            <dl className={'divide-y border-y'}>
              {principles.map(([title, description]) => (
                <div key={title} className={'grid gap-2 py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8'}>
                  <dt className={'font-semibold'}>{title}</dt>
                  <dd className={'text-sm leading-7 text-muted-foreground'}>{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className={'pb-14 sm:pb-20'} aria-labelledby={'about-cta-title'}>
          <div className={'container grid gap-6 rounded-3xl border bg-card p-8 shadow-[var(--academy-shadow-card)] sm:p-10 md:grid-cols-[1fr_auto] md:items-end'}>
            <SectionHeader
              id={'about-cta-title'}
              title={'เลือกทักษะที่อยากพัฒนา แล้วเริ่มสร้างโปรเจกต์แรก'}
              description={'ดูรายละเอียด ผลลัพธ์ และเนื้อหาของแต่ละคอร์สก่อนตัดสินใจเรียน'}
            />
            <div className={'flex flex-wrap gap-3'}>
              <Button asChild><Link href={'/courses'}>ดูคอร์สทั้งหมด <ArrowRight data-icon={'inline-end'} aria-hidden={'true'} /></Link></Button>
              <Button variant={'outline'} asChild><Link href={'/contact'}>ติดต่อ MilerDev</Link></Button>
            </div>
          </div>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}
