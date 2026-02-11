import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'MilerDev - เรียน Coding ออนไลน์';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        marginBottom: '32px',
                    }}
                >
                    <div
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '20px',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '40px',
                            fontWeight: 700,
                            color: '#2563eb',
                        }}
                    >
                        M
                    </div>
                    <div
                        style={{
                            fontSize: '56px',
                            fontWeight: 700,
                            color: 'white',
                        }}
                    >
                        MilerDev
                    </div>
                </div>
                <div
                    style={{
                        fontSize: '28px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        maxWidth: '600px',
                        textAlign: 'center',
                        lineHeight: 1.5,
                    }}
                >
                    เรียน Coding ออนไลน์
                </div>
                <div
                    style={{
                        fontSize: '20px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginTop: '16px',
                    }}
                >
                    Web Development • Backend • DevOps
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
