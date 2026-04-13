import { db } from '@/lib/db';
import { docs, docGroups } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export const dynamic = 'force-dynamic';

export default async function DocsIndexPage() {
    const [allGroups, publishedDocs] = await Promise.all([
        db.select().from(docGroups).orderBy(asc(docGroups.orderIndex)),
        db.select({ id: docs.id, title: docs.title, slug: docs.slug, groupId: docs.groupId })
            .from(docs)
            .where(eq(docs.status, 'published'))
            .orderBy(asc(docs.orderIndex)),
    ]);

    const docsByGroup = new Map<string, typeof publishedDocs>();
    for (const doc of publishedDocs) {
        const groupDocs = docsByGroup.get(doc.groupId) ?? [];
        groupDocs.push(doc);
        docsByGroup.set(doc.groupId, groupDocs);
    }

    const groups = allGroups.map(g => ({
        ...g,
        docs: docsByGroup.get(g.id) ?? [],
    }));

    const totalDocs = publishedDocs.length;

    return (
        <>
            <Navbar />
            <main>
                <PageHeader
                    badge="Knowledge Base"
                    title="คลังความรู้สำหรับนักพัฒนา"
                    description="รวมเอกสาร บทความสั้น และคู่มือการเขียนโปรแกรม สำหรับทบทวนความรู้และใช้เป็นแหล่งอ้างอิง"
                    align="center"
                />

                <style>{`
                    .doc-card-link {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 12px 16px;
                        background: #f8fafc;
                        border-radius: 8px;
                        text-decoration: none;
                        color: #334155;
                        font-weight: 500;
                        font-size: 0.9375rem;
                        border: 1px solid #e2e8f0;
                        transition: all 0.15s ease;
                    }
                    .doc-card-link:hover {
                        border-color: #3b82f6;
                        color: #2563eb;
                        background: #eff6ff;
                    }
                `}</style>

                <section style={{ background: '#f8fafc', minHeight: '60vh', padding: '48px 0' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
                        {groups.length === 0 || totalDocs === 0 ? (
                            <div style={{ textAlign: 'center', color: '#64748b', padding: '80px 0' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', display: 'block' }}>
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
                                </svg>
                                <p>ยังไม่มีบทความในคลังความรู้</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {groups.filter(g => g.docs.length > 0).map(group => (
                                    <div key={group.id} style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}>
                                        <div style={{ marginBottom: '20px' }}>
                                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                                                {group.title}
                                            </h2>
                                            {group.description && (
                                                <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: 0 }}>{group.description}</p>
                                            )}
                                        </div>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                                            {group.docs.map(doc => (
                                                <li key={doc.id}>
                                                    <Link href={`/docs/${doc.slug}`} className="doc-card-link">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: '#94a3b8' }}>
                                                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                                        </svg>
                                                        {doc.title}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

