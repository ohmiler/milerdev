'use client';

import { useRef, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [honey, setHoney] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const formLoadTime = useRef(Date.now());

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, _honey: honey, _timestamp: formLoadTime.current }),
            });
            const data = await response.json();

            if (!response.ok) {
                setErrorMessage(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
                setSubmitStatus('error');
            } else {
                setSubmitStatus('success');
                setFormData({ name: '', email: '', subject: '', message: '' });
                formLoadTime.current = Date.now();
            }
        } catch {
            setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="contact-desk">
                <header className="contact-desk__hero">
                    <div className="container">
                        <p className="contact-desk__meta">Contact / MilerDev</p>
                        <h1>บอกเราได้ว่าคุณกำลังติดเรื่องไหน</h1>
                        <p>สอบถามเรื่องคอร์ส การเรียน การชำระเงิน หรือเสนอความร่วมมือ ส่งรายละเอียดมาให้ครบเพื่อให้ทีมตอบกลับได้ตรงประเด็น</p>
                    </div>
                </header>

                <section className="contact-desk__body" aria-labelledby="contact-form-title">
                    <div className="container contact-desk__grid">
                        <aside className="contact-desk__info" aria-label="ข้อมูลการติดต่อ">
                            <p className="contact-desk__section-label">Contact desk</p>
                            <h2>ช่องทางติดต่อ</h2>
                            <dl>
                                <div>
                                    <dt>อีเมล</dt>
                                    <dd><a href="mailto:milerdev.official@gmail.com">milerdev.official@gmail.com</a></dd>
                                </div>
                                <div>
                                    <dt>เวลาทำการ</dt>
                                    <dd>จันทร์ถึงศุกร์<br />09:00 ถึง 18:00 น.</dd>
                                </div>
                                <div>
                                    <dt>เรื่องที่ติดต่อได้</dt>
                                    <dd>คอร์สและการเรียน<br />การชำระเงิน<br />งานวิทยากรและความร่วมมือ</dd>
                                </div>
                            </dl>
                            <p className="contact-desk__note">หลีกเลี่ยงการส่งรหัสผ่าน ข้อมูลบัตร หรือข้อมูลส่วนตัวที่ไม่จำเป็นผ่านแบบฟอร์มนี้</p>
                        </aside>

                        <div className="contact-form-panel">
                            <div className="contact-form-panel__head">
                                <p className="contact-desk__section-label">Send a message</p>
                                <h2 id="contact-form-title">ส่งรายละเอียดให้ทีม MilerDev</h2>
                                <p>กรอกข้อมูลที่จำเป็น ทีมจะใช้ข้อมูลนี้เพื่อตอบกลับคำถามของคุณเท่านั้น</p>
                            </div>

                            {submitStatus === 'success' ? (
                                <div className="contact-success" role="status" aria-live="polite">
                                    <span aria-hidden="true">✓</span>
                                    <h3>ส่งข้อความเรียบร้อย</h3>
                                    <p>ทีมได้รับรายละเอียดแล้ว และจะตอบกลับผ่านอีเมลที่คุณระบุ</p>
                                    <button type="button" onClick={() => setSubmitStatus('idle')}>ส่งข้อความใหม่</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="contact-form">
                                    <div className="contact-honeypot" aria-hidden="true">
                                        <label htmlFor="contact-website">เว็บไซต์</label>
                                        <input id="contact-website" type="text" name="website" tabIndex={-1} autoComplete="off" value={honey} onChange={(event) => setHoney(event.target.value)} />
                                    </div>

                                    {submitStatus === 'error' && errorMessage && <div className="contact-form__error" role="alert">{errorMessage}</div>}

                                    <div className="contact-form__row">
                                        <div className="contact-field">
                                            <label htmlFor="contact-name">ชื่อ</label>
                                            <input id="contact-name" name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder="ชื่อที่ใช้ติดต่อ" />
                                        </div>
                                        <div className="contact-field">
                                            <label htmlFor="contact-email">อีเมล</label>
                                            <input id="contact-email" name="email" type="email" required maxLength={255} autoComplete="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} placeholder="name@example.com" />
                                        </div>
                                    </div>

                                    <div className="contact-field">
                                        <label htmlFor="contact-subject">หัวข้อที่ต้องการติดต่อ</label>
                                        <input id="contact-subject" name="subject" type="text" required minLength={2} maxLength={200} value={formData.subject} onChange={(event) => setFormData({ ...formData, subject: event.target.value })} placeholder="เช่น สอบถามการเข้าเรียนคอร์ส" />
                                    </div>

                                    <div className="contact-field">
                                        <div className="contact-field__label"><label htmlFor="contact-message">รายละเอียด</label><span>10 ถึง 5,000 ตัวอักษร</span></div>
                                        <textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={7} value={formData.message} onChange={(event) => setFormData({ ...formData, message: event.target.value })} placeholder="อธิบายสิ่งที่ต้องการให้ทีมช่วย พร้อมข้อมูลที่เกี่ยวข้อง" />
                                    </div>

                                    <div className="contact-form__submit">
                                        <p>เมื่อส่งข้อความ คุณยืนยันว่าข้อมูลที่ระบุสามารถใช้เพื่อติดต่อกลับได้</p>
                                        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'กำลังส่งข้อความ…' : 'ส่งข้อความถึงทีม'}</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}