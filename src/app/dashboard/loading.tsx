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

export default function DashboardLoading() {
    return (
        <>
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            <Navbar />
            <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
                <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
                    {/* Header */}
                    <div style={{ marginBottom: '40px' }}>
                        <Skeleton width="300px" height="32px" style={{ marginBottom: '8px' }} />
                        <Skeleton width="250px" height="20px" />
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px',
                        marginBottom: '40px',
                    }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{
                                background: 'white',
                                padding: '24px',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            }}>
                                <Skeleton width="120px" height="14px" style={{ marginBottom: '8px' }} />
                                <Skeleton width="60px" height="36px" />
                            </div>
                        ))}
                    </div>

                    {/* Course Cards */}
                    <Skeleton width="150px" height="24px" style={{ marginBottom: '20px' }} />
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '20px',
                    }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{
                                background: 'white',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            }}>
                                <Skeleton width="100%" height="0" style={{ paddingBottom: '56.25%' }} borderRadius="0" />
                                <div style={{ padding: '20px' }}>
                                    <Skeleton width="80%" height="18px" style={{ marginBottom: '12px' }} />
                                    <Skeleton width="100%" height="6px" borderRadius="3px" style={{ marginBottom: '12px' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Skeleton width="80px" height="14px" />
                                        <Skeleton width="70px" height="24px" borderRadius="50px" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
