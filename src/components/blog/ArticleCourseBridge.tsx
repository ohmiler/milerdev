import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ArticleCourseBridge() {
  return (
    <section className={'mt-10'} aria-labelledby={'article-course-bridge-title'}>
      <Card size={'sm'}>
        <CardHeader>
          <CardTitle id={'article-course-bridge-title'} className={'text-xl'}>
            ฝึกต่อจากแนวคิดนี้
          </CardTitle>
          <CardDescription className={'max-w-2xl leading-6'}>
            อยากลงมือทำเป็นลำดับ? ดูคอร์สทั้งหมดแล้วเลือกจากหัวข้อและระดับที่ตรงกับคุณ
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant={'outline'} asChild>
            <Link href={'/courses'}>
              ดูคอร์สทั้งหมด
              <ArrowRight data-icon={'inline-end'} aria-hidden={true} />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
