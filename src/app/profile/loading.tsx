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

export default function ProfileLoading() {
    return (
        <>
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            <Navbar />
            <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
                <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', maxWidth: '800px' }}>
                    {/* Profile Card */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        marginBottom: '24px',
                    }}>
                        {/* Banner */}
                        <Skeleton width="100%" height="120px" borderRadius="0" />
                        <div style={{ padding: '0 32px 24px', position: 'relative' }}>
                            {/* Avatar */}
                            <div style={{ marginTop: '-40px', marginBottom: '16px' }}>
                                <Skeleton width="100px" height="100px" borderRadius="50%" />
                            </div>
                            <Skeleton width="200px" height="24px" style={{ marginBottom: '8px' }} />
                            <Skeleton width="250px" height="16px" />
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px',
                    }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                textAlign: 'center',
                            }}>
                                <Skeleton width="40px" height="32px" style={{ margin: '0 auto 8px' }} />
                                <Skeleton width="80px" height="14px" style={{ margin: '0 auto' }} />
                            </div>
                        ))}
                    </div>

                    {/* Profile Form */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    }}>
                        <Skeleton width="120px" height="20px" style={{ marginBottom: '20px' }} />
                        <Skeleton width="100%" height="44px" style={{ marginBottom: '16px' }} />
                        <Skeleton width="100%" height="44px" style={{ marginBottom: '16px' }} />
                        <Skeleton width="120px" height="40px" />
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
