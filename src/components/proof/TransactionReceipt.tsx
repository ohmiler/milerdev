import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import RefreshAccessButton from './RefreshAccessButton';
import styles from './proof.module.css';

interface ReceiptItem {
  id: string;
  title: string;
  href?: string;
}

interface TransactionReceiptProps {
  kind: 'course' | 'bundle';
  title: string;
  amount: string;
  orderId?: string | null;
  thumbnailUrl?: string | null;
  accessReady: boolean;
  primaryHref?: string;
  primaryLabel?: string;
  items?: ReceiptItem[];
}

function formatAmount(amount: string) {
  const value = Number.parseFloat(amount);
  return Number.isFinite(value)
    ? `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
    : amount;
}

function formatOrderId(orderId?: string | null) {
  if (!orderId) return 'รอสร้างเลขอ้างอิง';
  return orderId.length > 12 ? `${orderId.slice(0, 12).toUpperCase()}…` : orderId.toUpperCase();
}

export default function TransactionReceipt({
  kind,
  title,
  amount,
  orderId,
  thumbnailUrl,
  accessReady,
  primaryHref,
  primaryLabel,
  items = [],
}: TransactionReceiptProps) {
  const kindLabel = kind === 'bundle' ? 'ชุดคอร์ส' : 'คอร์สเรียน';

  return (
    <>
      <Navbar />
      <main className={styles.proofPage}>
        <div className={`container ${styles.proofContainer}`}>
          <header className={styles.proofHeader}>
            <div>
              <p className={styles.eyebrow}>Transaction proof</p>
              <h1>{accessReady ? 'ชำระเงินแล้ว พร้อมเริ่มเรียน' : 'กำลังยืนยันสิทธิ์การเรียน'}</h1>
              <p className={styles.lead}>
                {accessReady
                  ? 'รายการนี้ผ่านการยืนยันและสิทธิ์เรียนถูกเพิ่มในบัญชีของคุณแล้ว'
                  : 'ระบบได้รับรายการแล้ว แต่สิทธิ์เรียนยังไม่พร้อม กรุณาตรวจสอบสถานะอีกครั้งก่อนเริ่มเรียน'}
              </p>
            </div>
            <div className={styles.proofReference}>
              <span>ORDER REFERENCE</span>
              <strong>{formatOrderId(orderId)}</strong>
            </div>
          </header>

          <div className={styles.receiptLayout}>
            <article className={styles.receipt} aria-labelledby="receipt-product-title">
              <div className={styles.receiptTopline}>
                <span>รายการสั่งซื้อ</span>
                <span>{kind === 'bundle' ? `${items.length} COURSES` : '1 COURSE'}</span>
              </div>

              <div className={styles.receiptProduct}>
                <div className={styles.receiptMedia}>
                  {thumbnailUrl ? (
                    <Image src={thumbnailUrl} alt="" fill sizes="(max-width: 680px) 100vw, 220px" />
                  ) : (
                    <div className={styles.receiptFallback} aria-hidden="true">MD</div>
                  )}
                </div>
                <div className={styles.receiptProductCopy}>
                  <p>{kindLabel}</p>
                  <h2 id="receipt-product-title">{title}</h2>
                  <strong>{formatAmount(amount)}</strong>
                </div>
              </div>

              {items.length > 0 && (
                <div className={styles.receiptItems}>
                  <p className={styles.sectionLabel}>Included courses</p>
                  <ol>
                    {items.map((item, index) => (
                      <li key={item.id}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        {item.href ? <Link href={item.href}>{item.title}</Link> : <span>{item.title}</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <dl className={styles.receiptFacts}>
                <div><dt>ยอดรายการ</dt><dd>{formatAmount(amount)}</dd></div>
                <div><dt>สถานะสิทธิ์</dt><dd>{accessReady ? 'พร้อมเรียน' : 'กำลังยืนยัน'}</dd></div>
                <div><dt>เลขอ้างอิง</dt><dd>{formatOrderId(orderId)}</dd></div>
              </dl>
            </article>

            <aside className={styles.receiptAside} aria-label="ขั้นตอนถัดไป">
              <div
                className={`${styles.accessState} ${accessReady ? styles.accessReady : styles.accessPending}`}
                data-access={accessReady ? 'ready' : 'pending'}
                role="status"
              >
                <span className={styles.accessMarker} aria-hidden="true">{accessReady ? '✓' : '…'}</span>
                <p>{accessReady ? 'LEARNING ACCESS READY' : 'ACCESS VERIFICATION'}</p>
                <h2>{accessReady ? 'คอร์สอยู่ในบัญชีแล้ว' : 'ยังไม่ควรเริ่มเรียน'}</h2>
                <p>
                  {accessReady
                    ? 'เปิดบทเรียนได้ทันที หรือกลับไปดูภาพรวมการเรียนทั้งหมดใน Dashboard'
                    : 'อย่าชำระเงินซ้ำ ระบบอาจใช้เวลาสั้น ๆ ในการยืนยันและเพิ่มสิทธิ์เรียน'}
                </p>
              </div>

              <div className={styles.receiptActions}>
                {accessReady && primaryHref && primaryLabel ? (
                  <Link className={styles.primaryAction} href={primaryHref}>{primaryLabel}<span aria-hidden="true">→</span></Link>
                ) : (
                  <RefreshAccessButton className={styles.primaryAction} />
                )}
                <Link className={styles.secondaryAction} href="/dashboard">ไปยัง Dashboard</Link>
              </div>

              <div className={styles.receiptHelp}>
                <p>ต้องการความช่วยเหลือเกี่ยวกับรายการนี้?</p>
                <a href="mailto:milerdev.official@gmail.com">milerdev.official@gmail.com</a>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
