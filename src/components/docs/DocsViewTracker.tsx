'use client';

import { useEffect } from 'react';

interface Props {
    slug: string;
}

export default function DocsViewTracker({ slug }: Props) {
    useEffect(() => {
        fetch(`/api/docs/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {});
    }, [slug]);

    return null;
}
