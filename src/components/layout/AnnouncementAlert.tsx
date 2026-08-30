'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';

import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success' | 'error';
}

const announcementTypes: Record<
    Announcement['type'],
    { icon: LucideIcon; variant: 'info' | 'warning' | 'success' | 'destructive' }
> = {
    info: { icon: Info, variant: 'info' },
    warning: { icon: TriangleAlert, variant: 'warning' },
    success: { icon: CircleCheck, variant: 'success' },
    error: { icon: CircleAlert, variant: 'destructive' },
};

export default function AnnouncementAlert() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set();
        try {
            const stored = sessionStorage.getItem('dismissed_announcements');
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    });

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/announcements', { signal: controller.signal })
            .then((response) => {
                if (!response.ok) throw new Error('Failed to load announcements');
                return response.json();
            })
            .then((data) => {
                setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
            })
            .catch((error: unknown) => {
                const isAbortError = typeof error === 'object'
                    && error !== null
                    && 'name' in error
                    && error.name === 'AbortError';
                if (!isAbortError) setAnnouncements([]);
            });

        return () => controller.abort();
    }, []);

    const dismiss = (id: string) => {
        const next = new Set(dismissed);
        next.add(id);
        setDismissed(next);
        try {
            sessionStorage.setItem('dismissed_announcements', JSON.stringify([...next]));
        } catch {
            // Dismissal still applies to the current render when persistence fails.
        }
    };

    const announcement = announcements.find((item) => !dismissed.has(item.id));
    if (!announcement) return null;

    const config = announcementTypes[announcement.type] ?? announcementTypes.info;
    const Icon = config.icon;

    return (
        <section className="border-b bg-background" aria-label="ประกาศ">
            <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                <Alert variant={config.variant}>
                    <Icon aria-hidden="true" />
                    <AlertTitle>{announcement.title}</AlertTitle>
                    <AlertDescription>
                        <Link href="/announcements">อ่านรายละเอียดประกาศ</Link>
                    </AlertDescription>
                    <AlertAction>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => dismiss(announcement.id)}
                            aria-label="ปิดประกาศ"
                        >
                            <X data-icon="inline-start" aria-hidden="true" />
                        </Button>
                    </AlertAction>
                </Alert>
            </div>
        </section>
    );
}
