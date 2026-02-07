function Skeleton({ width, height, borderRadius = '8px', style = {} }: { width: string; height: string; borderRadius?: string; style?: React.CSSProperties }) {
    return (
        <div style={{
            width,
            height,
            borderRadius,
            background: 'linear-gradient(90deg, #334155 25%, #3e4f66 50%, #334155 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            ...style,
        }} />
    );
}

export default function LearnLoading() {
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a' }}>
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

            {/* Header */}
            <header style={{
                background: '#1e293b',
                borderBottom: '1px solid #334155',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Skeleton width="50px" height="20px" />
                    <span style={{ color: '#475569' }}>|</span>
                    <Skeleton width="180px" height="20px" />
                </div>
                <Skeleton width="100px" height="20px" />
            </header>

            <div style={{ display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
                {/* Video Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Video Player Skeleton */}
                    <div style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        background: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="#475569">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>

                    {/* Lesson Info */}
                    <div style={{ padding: '24px' }}>
                        <Skeleton width="60%" height="28px" style={{ marginBottom: '16px' }} />
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <Skeleton width="120px" height="14px" />
                            <Skeleton width="160px" height="32px" borderRadius="8px" />
                        </div>
                        <Skeleton width="100%" height="80px" borderRadius="12px" />
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="hidden lg:block" style={{
                    width: '320px',
                    minWidth: '320px',
                    background: '#1e293b',
                    borderLeft: '1px solid #334155',
                    padding: '16px',
                }}>
                    <Skeleton width="160px" height="14px" style={{ marginBottom: '16px', marginLeft: '16px' }} />
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            marginBottom: '4px',
                        }}>
                            <Skeleton width="28px" height="28px" borderRadius="50%" />
                            <div style={{ flex: 1 }}>
                                <Skeleton width="80%" height="14px" style={{ marginBottom: '4px' }} />
                                <Skeleton width="40px" height="10px" />
                            </div>
                        </div>
                    ))}
                </aside>
            </div>
        </div>
    );
}
