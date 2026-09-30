import type { OrderReview } from '@/lib/order-review';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function formatOrderAmount(amount: string | number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount));
}

export default function OrderReviewSummary({ review }: { review: OrderReview }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{review.target.type === 'bundle' ? 'ตรวจสอบรายการ Bundle' : 'ตรวจสอบรายการคอร์ส'}</CardTitle>
        <CardDescription className="break-words">{review.target.title}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-3">
        <dl className="grid gap-3 text-sm [&>div]:flex [&>div]:flex-wrap [&>div]:justify-between [&>div]:gap-2 [&_dd]:min-w-0 [&_dd]:break-words">
          {review.comparison ? <div><dt>ซื้อแยกวันนี้</dt><dd>{formatOrderAmount(review.comparison.separate)}</dd></div> : null}
          <div><dt>ราคาก่อนใช้คูปอง</dt><dd>{formatOrderAmount(review.price.original)}</dd></div>
          <div><dt>ส่วนลดคูปอง</dt><dd>{formatOrderAmount(review.price.discount)}</dd></div>
          <div><dt>ยอดชำระ (THB)</dt><dd><strong>{formatOrderAmount(review.price.amountDue)}</strong></dd></div>
        </dl>
        {review.comparison ? <p className="text-sm">{review.comparison.label}</p> : null}
        <p className="text-sm">{review.access.description}</p>
        <p className="text-sm text-muted-foreground">ระบบจะตรวจสอบราคาและสิทธิ์อีกครั้งก่อนเริ่มรายการ</p>
      </CardContent>
    </Card>
  );
}
