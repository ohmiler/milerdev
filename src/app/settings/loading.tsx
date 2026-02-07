import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

function Skeleton({ width, height, borderRadius = '8px', style = {} }: { width: string; height: string; borderRadius?: string; style?: React.CSSProperties }) {
    return (
        <div style={{
            width,
            height,
            borderRadius,
            background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            ...style,
        }} />
    );
}

export default function SettingsLoading() {
    return (
        <>
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            <Navbar />
            <main style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8fafc' }}>
                <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', maxWidth: '800px' }}>
                    {/* Header */}
                    <div style={{ marginBottom: '32px' }}>
                        <Skeleton width="100px" height="32px" style={{ marginBottom: '8px' }} />
                        <Skeleton width="220px" height="18px" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Account Settings */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}>
                            <Skeleton width="60px" height="20px" style={{ marginBottom: '20px' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <Skeleton width="100%" height="64px" borderRadius="12px" />
                                <Skeleton width="100%" height="64px" borderRadius="12px" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
