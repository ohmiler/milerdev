import Link from 'next/link';
import { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา',
  description: 'แพลตฟอร์มเรียนออนไลน์สำหรับนักพัฒนาซอฟต์แวร์ สร้างโดย MilerDev',
  alternates: {
    canonical: 'https://milerdev.com/about',
  },
  openGraph: {
    title: 'เกี่ยวกับเรา',
    description: 'แพลตฟอร์มเรียนออนไลน์สำหรับนักพัฒนาซอฟต์แวร์ สร้างโดย MilerDev',
    url: '/about',
    siteName: 'MilerDev',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'เกี่ยวกับเรา - MilerDev',
    description: 'แพลตฟอร์มเรียนออนไลน์สำหรับนักพัฒนาซอฟต์แวร์ สร้างโดย MilerDev',
  },
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      
      <main style={{ paddingTop: '0' }}>
        {/* Hero Section */}
        <section style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #eff6ff 100%)',
          padding: '80px 0 100px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
              {/* Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
                color: '#2563eb',
                padding: '10px 20px',
                borderRadius: '50px',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '24px',
                border: '1px solid #bfdbfe'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                }} />
                เกี่ยวกับเรา
              </div>

              <h1 className="hero-title" style={{ marginBottom: '24px' }}>
                รู้จัก{' '}
                <span className="highlight">MilerDev</span>
              </h1>

              <p style={{
                fontSize: '1.25rem',
                color: '#64748b',
                marginBottom: '32px',
                lineHeight: 1.8,
                maxWidth: '600px',
                margin: '0 auto 32px'
              }}>
                แพลตฟอร์มเรียนออนไลน์สำหรับนักพัฒนาซอฟต์แวร์ ที่สร้างขึ้นมาเพื่อให้ความรู้และประสบการณ์การเรียนรู้ที่ดีที่สุด
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
                <Link href="/courses" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '16px 32px' }}>
                  ดูคอร์สทั้งหมด
                </Link>
                <Link href="/register" className="btn btn-secondary" style={{ fontSize: '1.1rem', padding: '16px 32px' }}>
                  สมัครสมาชิกฟรี
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="section" style={{ background: 'white' }}>
          <div className="container">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '60px',
              alignItems: 'center',
            }}>
              <div>
                <h2 className="section-title" style={{ marginBottom: '20px' }}>
                  พันธกิจของเรา
                </h2>
                <p style={{
                  fontSize: '1.125rem',
                  color: '#64748b',
                  lineHeight: 1.8,
                  marginBottom: '30px',
                }}>
                  เรามุ่งมั่นที่จะสร้างแพลตฟอร์มการเรียนรู้ที่ทันสมัย ให้การศึกษาคุณภาพสูงสามารถเข้าถึงได้ง่ายสำหรับทุกคน โดยเฉพาะนักพัฒนาซอฟต์แวร์ที่ต้องการพัฒนาทักษะและอัปเดตความรู้อย่างต่อเนื่อง
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    'คอร์สคุณภาพสูงจากผู้เชี่ยวชาญ',
                    'เรียนได้ทุกที่ทุกเวลา',
                    'รองรับอุปกรณ์ทุกชนิด',
                    'ชุมชนนักพัฒนาที่แข็งแกร่ง'
                  ].map((item, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: '#dbeafe',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563eb',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}>
                        ✓
                      </div>
                      <span style={{ color: '#1e293b', fontWeight: 500 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderRadius: '16px',
                padding: '48px',
                textAlign: 'center',
                border: '1px solid #bfdbfe',
              }}>
                <div className="feature-icon" style={{ margin: '0 auto 24px' }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginBottom: '16px',
                }}>
                  สร้างอนาคตของคุณ
                </h3>
                <p style={{ color: '#64748b', lineHeight: 1.7 }}>
                  เรียนรู้ทักษะใหม่ๆ และพัฒนาศักยภาพในการเขียนโปรแกรมกับเรา
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section" style={{ background: '#f8fafc' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2 className="section-title" style={{ marginBottom: '16px' }}>
                ทำไมต้องเรียนกับเรา?
              </h2>
              <p style={{ color: '#64748b', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>
                แพลตฟอร์มของเราถูกออกแบบมาเพื่อให้ประสบการณ์การเรียนรู้ที่ดีที่สุด
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '32px'
            }}>
              {[
                { icon: '📚', title: 'เนื้อหาครบถ้วน', desc: 'คอร์สที่ครอบคลุมทุกแง่มุม ตั้งแต่พื้นฐานไปจนถึงขั้นสูง' },
                { icon: '👨‍🏫', title: 'ผู้สอนคุณภาพ', desc: 'วิทยากรที่มีประสบการณ์จริงในอุตสาหกรรม' },
                { icon: '💻', title: 'ฝึกปฏิบัติจริง', desc: 'โปรเจกต์และการฝึกปฏิบัติที่ใช้ในงานจริง' },
                { icon: '🎯', title: 'ติดตามความคืบหน้า', desc: 'ระบบติดตามความก้าวหน้าของคุณแบบ real-time' },
                { icon: '🏆', title: 'ใบประกาศนียบัตร', desc: 'รับใบประกาศนียบัตรเมื่อเรียนจบคอร์ส' },
                { icon: '💬', title: 'ชุมชนสนับสนุน', desc: 'พูดคุยและแลกเปลี่ยนความรู้กับเพื่อนๆ' },
              ].map((feature, index) => (
                <div key={index} className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
                    {feature.icon}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                    {feature.title}
                  </h3>
                  <p style={{ color: '#64748b', lineHeight: 1.7 }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section" style={{ padding: '100px 0' }}>
          <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              color: 'white',
              marginBottom: '16px',
              lineHeight: 1.3
            }}>
              พร้อมที่จะเริ่มต้นเรียนหรือยัง?
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '1.125rem',
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px'
            }}>
              สมัครสมาชิกฟรีวันนี้ และเริ่มต้นเส้นทางสู่การเป็น Developer มืออาชีพ
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/courses"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'white',
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: '1.125rem',
                  padding: '18px 36px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                }}
              >
                สำรวจคอร์ส
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1.125rem',
                  padding: '18px 36px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  border: '2px solid rgba(255,255,255,0.5)',
                }}
              >
                สมัครฟรี
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
