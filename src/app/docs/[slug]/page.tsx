import { db } from '@/lib/db';
import { docs, docGroups } from '@/lib/db/schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { sanitizeRichContent, highlightCodeBlocks } from '@/lib/sanitize';
import CodeCopyButton from '@/components/blog/CodeCopyButton';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const [doc] = await db
        .select({ title: docs.title, content: docs.content, updatedAt: docs.updatedAt })
        .from(docs)
        .where(and(eq(docs.slug, slug), eq(docs.status, 'published')))
        .limit(1);
    if (!doc) return { title: 'ไม่พบบทความ' };

    const excerpt = doc.content
        ? doc.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 155) + '…'
        : `เรียนรู้เกี่ยวกับ ${doc.title} ในคลังความรู้ MilerDev`;

    return {
        title: doc.title,
        description: excerpt,
        keywords: [doc.title, 'คลังความรู้', 'MilerDev', 'programming', 'เขียนโปรแกรม'],
        alternates: { canonical: `/docs/${slug}` },
        openGraph: {
            type: 'article',
            title: `${doc.title} - MilerDev Docs`,
            description: excerpt,
            url: `/docs/${slug}`,
            siteName: 'MilerDev',
            modifiedTime: doc.updatedAt?.toISOString(),
        },
        twitter: {
            card: 'summary',
            title: `${doc.title} - MilerDev Docs`,
            description: excerpt,
        },
    };
}

export default async function DocDetailPage({ params }: Props) {
    const { slug } = await params;

    const [docRow] = await db
        .select({
            id: docs.id,
            groupId: docs.groupId,
            title: docs.title,
            slug: docs.slug,
            content: docs.content,
            orderIndex: docs.orderIndex,
            status: docs.status,
            viewCount: docs.viewCount,
            createdAt: docs.createdAt,
            updatedAt: docs.updatedAt,
            groupTitle: docGroups.title,
            groupSlug: docGroups.slug,
        })
        .from(docs)
        .leftJoin(docGroups, eq(docs.groupId, docGroups.id))
        .where(eq(docs.slug, slug))
        .limit(1);

    if (!docRow || docRow.status !== 'published') notFound();

    const doc = {
        ...docRow,
        group: { id: docRow.groupId, title: docRow.groupTitle ?? '', slug: docRow.groupSlug ?? '' },
    };

    // Fire-and-forget view count increment (SQL increment avoids race condition)
    db.update(docs).set({ viewCount: sql`view_count + 1` }).where(eq(docs.id, doc.id)).execute().catch(() => {});

    // Fetch sidebar navigation (two separate queries — no lateral join)
    const [allGroups, sidebarDocs] = await Promise.all([
        db.select().from(docGroups).orderBy(asc(docGroups.orderIndex)),
        db.select({ id: docs.id, title: docs.title, slug: docs.slug, groupId: docs.groupId })
            .from(docs)
            .where(eq(docs.status, 'published'))
            .orderBy(asc(docs.orderIndex)),
    ]);

    const groups = allGroups.map(g => ({
        ...g,
        docs: sidebarDocs.filter(d => d.groupId === g.id),
    }));

    const processedContent = sanitizeRichContent(highlightCodeBlocks(doc.content ?? ''));

    const updatedDate = new Date(doc.updatedAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const plainText = (doc.content ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: doc.title,
        description: plainText.slice(0, 155),
        dateModified: new Date(doc.updatedAt).toISOString(),
        datePublished: new Date(doc.createdAt).toISOString(),
        author: { '@type': 'Organization', name: 'MilerDev', url: process.env.NEXT_PUBLIC_APP_URL || 'https://milerdev.com' },
        publisher: { '@type': 'Organization', name: 'MilerDev' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${process.env.NEXT_PUBLIC_APP_URL || 'https://milerdev.com'}/docs/${slug}` },
    };
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://milerdev.com';
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'หน้าแรก',
                item: siteUrl,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Docs',
                item: `${siteUrl}/docs`,
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: doc.group.title,
                item: `${siteUrl}/docs`,
            },
            {
                '@type': 'ListItem',
                position: 4,
                name: doc.title,
                item: `${siteUrl}/docs/${slug}`,
            },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
            <Navbar />
            <main>
                <style>{`
                    .docs-layout { display: flex; min-height: calc(100vh - 64px); }
                    .docs-sidebar { display: none !important; }
                    .docs-breadcrumb { display: flex !important; }
                    @media (min-width: 1024px) {
                        .docs-sidebar { display: flex !important; flex-direction: column; }
                        .docs-breadcrumb { display: none !important; }
                    }
                    .docs-nav-link {
                        display: block;
                        padding: 6px 12px;
                        border-radius: 6px;
                        text-decoration: none;
                        font-size: 0.875rem;
                        color: #475569;
                        line-height: 1.5;
                        transition: background 0.1s, color 0.1s;
                    }
                    .docs-nav-link:hover { background: #f1f5f9; color: #1e293b; }
                    .docs-nav-link.active { background: #eff6ff; color: #2563eb; font-weight: 600; }
                    .prose h2 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 2.5rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; }
                    .prose h3 { font-size: 1.25rem; font-weight: 600; color: #0f172a; margin: 2rem 0 0.75rem; }
                    .prose h4 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 1.5rem 0 0.5rem; }
                    .prose p { margin-bottom: 1.125rem; }
                    .prose ul, .prose ol { margin-bottom: 1.125rem; padding-left: 1.5rem; }
                    .prose li { margin-bottom: 0.25rem; }
                    .prose pre { background: #0f172a; padding: 1.25rem; border-radius: 10px; overflow-x: auto; margin: 1.5rem 0; font-family: 'Fira Code', ui-monospace, monospace; line-height: 1.7; }
                    .prose pre code { background: transparent; padding: 0; color: #e2e8f0; font-size: 0.875rem; }
                    .prose pre .hljs-keyword, .prose pre .hljs-selector-tag { color: #c792ea; }
                    .prose pre .hljs-string, .prose pre .hljs-template-string, .prose pre .hljs-template-variable { color: #c3e88d; }
                    .prose pre .hljs-number, .prose pre .hljs-literal { color: #f78c6c; }
                    .prose pre .hljs-comment { color: #546e7a; font-style: italic; }
                    .prose pre .hljs-title, .prose pre .hljs-function, .prose pre .hljs-title.function_ { color: #82aaff; }
                    .prose pre .hljs-variable, .prose pre .hljs-params { color: #e2e8f0; }
                    .prose pre .hljs-attr, .prose pre .hljs-attribute { color: #f07178; }
                    .prose pre .hljs-built_in, .prose pre .hljs-type { color: #ffcb6b; }
                    .prose pre .hljs-tag { color: #f07178; }
                    .prose pre .hljs-name { color: #c792ea; }
                    .prose pre .hljs-operator, .prose pre .hljs-punctuation { color: #89ddff; }
                    .prose pre .hljs-property { color: #f07178; }
                    .prose pre .hljs-meta { color: #ffcb6b; }
                    .prose pre .hljs-symbol { color: #f78c6c; }
                    .prose pre { position: relative; }
                    .prose pre .code-copy-btn { position: absolute; top: 10px; right: 10px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #334155; border: 1px solid #475569; border-radius: 6px; color: #94a3b8; font-size: 0.75rem; cursor: pointer; opacity: 0; transition: opacity 0.15s, background 0.15s; line-height: 1; }
                    .prose pre:hover .code-copy-btn { opacity: 1; }
                    .prose pre .code-copy-btn:hover { background: #475569; color: #e2e8f0; }
                    .prose pre .code-copy-btn.copied { background: #166534; border-color: #16a34a; color: #4ade80; }
                    .prose code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; color: #db2777; }
                    .prose blockquote { border-left: 4px solid #cbd5e1; padding: 0.5rem 0 0.5rem 1.25rem; color: #64748b; font-style: italic; margin: 1.5rem 0; background: #f8fafc; border-radius: 0 8px 8px 0; }
                    .prose a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
                    .prose table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9375rem; }
                    .prose th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-weight: 600; border: 1px solid #e2e8f0; }
                    .prose td { padding: 10px 14px; border: 1px solid #e2e8f0; }
                    .prose img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
                    .prose hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
                    .docs-pager-link { display: flex; flex-direction: column; padding: 14px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-decoration: none; flex: 1; max-width: 48%; transition: border-color 0.15s, background 0.15s; }
                    .docs-pager-link:hover { border-color: #3b82f6; background: #eff6ff; }
                `}</style>

                <div style={{ display: 'flex', minHeight: '100vh', maxWidth: '1170px', margin: '0 auto' }}>

                    {/* Sidebar — sticky, fixed width */}
                    <aside
                        className="docs-sidebar"
                        style={{
                            width: '240px',
                            flexShrink: 0,
                            position: 'sticky',
                            top: '64px',
                            alignSelf: 'flex-start',
                            background: 'white',
                            borderRight: '1px solid #e2e8f0',
                        }}
                    >
                        {/* Inner scrollable — maxHeight not height, preserves travel distance */}
                        <div style={{ maxHeight: 'calc(100vh - 64px)', overflowY: 'auto', padding: '24px 12px' }}>
                            <Link href="/docs" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', marginBottom: '20px', fontSize: '0.8125rem', fontWeight: 500, padding: '0 4px' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                Docs หน้าแรก
                            </Link>
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {groups.map(group => (
                                    <div key={group.id}>
                                        <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '4px', padding: '0 12px' }}>
                                            {group.title}
                                        </p>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {group.docs.map(d => (
                                                <li key={d.id}>
                                                    <Link
                                                        href={`/docs/${d.slug}`}
                                                        className={`docs-nav-link${d.slug === slug ? ' active' : ''}`}
                                                    >
                                                        {d.title}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Content column — fills remaining width, white bg */}
                    <div style={{ flex: 1, minWidth: 0, background: 'white', borderLeft: '1px solid #e2e8f0' }}>

                        {/* Article container — left-aligned, constrained width */}
                        <div style={{ maxWidth: '960px', padding: '48px 48px 80px' }}>

                            {/* Mobile breadcrumb */}
                            <div className="docs-breadcrumb" style={{ alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: '#64748b', marginBottom: '28px', flexWrap: 'wrap' }}>
                                <Link href="/docs" style={{ color: '#3b82f6', textDecoration: 'none' }}>Docs</Link>
                                <span>/</span>
                                <span>{doc.group.title}</span>
                                <span>/</span>
                                <span style={{ color: '#1e293b' }}>{doc.title}</span>
                            </div>

                            <article>
                                <header style={{ marginBottom: '36px', paddingBottom: '28px', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                                        {doc.group.title}
                                    </div>
                                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '14px' }}>
                                        {doc.title}
                                    </h1>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
                                        <time dateTime={new Date(doc.updatedAt).toISOString()}>อัปเดต {updatedDate}</time>
                                        <span>·</span>
                                        <span>{doc.viewCount.toLocaleString()} ครั้งที่อ่าน</span>
                                    </div>
                                </header>

                                <div
                                    className="prose"
                                    dangerouslySetInnerHTML={{ __html: processedContent }}
                                    style={{ fontSize: '1rem', lineHeight: 1.8, color: '#334155' }}
                                />
                                <CodeCopyButton selector=".prose pre" />

                                {/* Next/Prev navigation */}
                                {(() => {
                                    const allDocs = groups.flatMap(g => g.docs);
                                    const idx = allDocs.findIndex(d => d.slug === slug);
                                    const prev = idx > 0 ? allDocs[idx - 1] : null;
                                    const next = idx < allDocs.length - 1 ? allDocs[idx + 1] : null;
                                    if (!prev && !next) return null;
                                    return (
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '48px', paddingTop: '28px', borderTop: '1px solid #e2e8f0', justifyContent: prev && next ? 'space-between' : prev ? 'flex-start' : 'flex-end' }}>
                                            {prev && (
                                                <Link href={`/docs/${prev.slug}`} className="docs-pager-link">
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>← ก่อนหน้า</span>
                                                    <span style={{ color: '#1e293b', fontWeight: 500, fontSize: '0.9375rem' }}>{prev.title}</span>
                                                </Link>
                                            )}
                                            {next && (
                                                <Link href={`/docs/${next.slug}`} className="docs-pager-link" style={{ alignItems: 'flex-end' }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>ถัดไป →</span>
                                                    <span style={{ color: '#1e293b', fontWeight: 500, fontSize: '0.9375rem' }}>{next.title}</span>
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })()}
                            </article>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
