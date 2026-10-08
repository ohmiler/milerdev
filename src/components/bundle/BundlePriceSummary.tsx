import type { BundleDecisionFacts } from '@/lib/commerce/bundle-decision-facts';

type BundlePriceSummaryProps = {
  price: BundleDecisionFacts['price'];
};

// Two prices to weigh: the bundle and buying the courses separately today. A third, the regular
// total before promotions, made the choice harder to read, so it is left out.
export default function BundlePriceSummary({ price }: BundlePriceSummaryProps) {
  return (
    <div className={'rounded-lg bg-muted p-5'}>
      <p className={'text-sm text-muted-foreground'}>ราคาชุด</p>
      <strong className={'mt-1 block text-3xl tracking-tight'}>
        {price.isFree ? 'ฟรี' : price.bundleFormatted}
      </strong>
      <dl className={'mt-4 flex flex-col gap-2 text-sm'}>
        <div className={'flex flex-wrap justify-between gap-2'}>
          <dt className={'text-muted-foreground'}>ซื้อแยกวันนี้</dt>
          <dd className={'font-medium'}>{price.separateCurrentFormatted}</dd>
        </div>
        <div className={'flex flex-wrap justify-between gap-2'}>
          <dt>เปรียบเทียบ</dt>
          <dd className={'font-semibold'}>{price.comparison.label}</dd>
        </div>
      </dl>
    </div>
  );
}
