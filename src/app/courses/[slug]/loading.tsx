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

export default function CourseDetailLoading() {
    return (
        <>
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            <Navbar />
            <main style={{ paddingTop: '64px', minHeight: '100vh' }}>
                {/* Hero Section */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
                    padding: '48px 0',
                    color: 'white',
                }}>
                    <div className="container">
                        <Skeleton width="200px" height="14px" style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <Skeleton width="70%" height="36px" style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <Skeleton width="90%" height="18px" style={{ marginBottom: '8px', opacity: 0.3 }} />
                        <Skeleton width="60%" height="18px" style={{ marginBottom: '24px', opacity: 0.3 }} />
                        <div style={{ display: 'flex', gap: '24px' }}>
                            <Skeleton width="120px" height="40px" borderRadius="50px" style={{ opacity: 0.3 }} />
                            <Skeleton width="100px" height="40px" borderRadius="50px" style={{ opacity: 0.3 }} />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
                        {/* Mobile Card */}
                        <div className="block lg:hidden" style={{
                            background: 'white',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}>
                            <Skeleton width="100%" height="0" style={{ paddingBottom: '56.25%' }} borderRadius="0" />
                            <div style={{ padding: '24px' }}>
                                <Skeleton width="100px" height="32px" style={{ marginBottom: '20px' }} />
                                <Skeleton width="100%" height="48px" borderRadius="12px" />
                            </div>
                        </div>

                        {/* Lessons */}
                        <div>
                            <Skeleton width="140px" height="24px" style={{ marginBottom: '24px' }} />
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '16px',
                                    marginBottom: '8px',
                                    background: 'white',
                                    borderRadius: '12px',
                                }}>
                                    <Skeleton width="36px" height="36px" borderRadius="50%" />
                                    <div style={{ flex: 1 }}>
                                        <Skeleton width="60%" height="16px" style={{ marginBottom: '6px' }} />
                                        <Skeleton width="80px" height="12px" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
