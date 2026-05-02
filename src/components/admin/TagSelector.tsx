'use client';

import { useState, useEffect, useRef } from 'react';

interface Tag {
    id: string;
    name: string;
    slug: string;
}

interface TagSelectorProps {
    selectedTagIds: string[];
    onChange: (tagIds: string[]) => void;
}

export default function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/admin/tags')
            .then(res => res.json())
            .then(data => setAllTags(data.tags || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTag = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) {
            onChange(selectedTagIds.filter(id => id !== tagId));
        } else {
            onChange([...selectedTagIds, tagId]);
        }
    };

    const removeTag = (tagId: string) => {
        onChange(selectedTagIds.filter(id => id !== tagId));
    };

    const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));
    const filteredTags = allTags.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '0.875rem',
            }}>
                กำลังโหลดแท็ก...
            </div>
        );
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Selected tags + trigger */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsOpen(!isOpen);
                    }
                }}
                style={{
                    width: '100%',
                    minHeight: '48px',
                    padding: '8px 12px',
                    border: '1px solid',
                    borderColor: isOpen ? '#02abff' : '#dbe8f2',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    alignItems: 'center',
                    textAlign: 'left',
                    background: 'linear-gradient(180deg, #ffffff, #f7fbff)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: isOpen ? '0 0 0 4px rgba(2, 171, 255, 0.18)' : 'inset 0 1px 0 rgba(255,255,255,0.82)',
                }}
            >
                {selectedTags.length > 0 ? (
                    selectedTags.map(tag => (
                        <span
                            key={tag.id}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                background: '#eefaff',
                                color: '#0089d6',
                                borderRadius: '8px',
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                            }}
                        >
                            {tag.name}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#0089d6',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    fontSize: '1rem',
                                    lineHeight: 1,
                                }}
                            >
                                &times;
                            </button>
                        </span>
                    ))
                ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                        คลิกเพื่อเลือกแท็ก...
                    </span>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'linear-gradient(180deg, #ffffff, #f8fafc)',
                    border: '1px solid #dbe5f4',
                    borderRadius: '8px',
                    boxShadow: '0 18px 30px rgba(15, 23, 42, 0.08)',
                    zIndex: 1000,
                    maxHeight: '240px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {/* Search */}
                    <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ค้นหาแท็ก..."
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                outline: 'none',
                            }}
                            autoFocus
                        />
                    </div>

                    {/* Tag list */}
                    <div style={{ overflowY: 'auto', maxHeight: '180px' }}>
                        {filteredTags.length === 0 ? (
                            <div style={{
                                padding: '16px',
                                textAlign: 'center',
                                color: '#94a3b8',
                                fontSize: '0.875rem',
                            }}>
                                {allTags.length === 0 ? 'ยังไม่มีแท็ก — ไปสร้างที่หน้าจัดการแท็กก่อน' : 'ไม่พบแท็กที่ค้นหา'}
                            </div>
                        ) : (
                            filteredTags.map(tag => {
                                const isSelected = selectedTagIds.includes(tag.id);
                                return (
                                    <button
                                        type="button"
                                        key={tag.id}
                                        onClick={(e) => { e.stopPropagation(); toggleTag(tag.id); }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            background: isSelected ? '#eefaff' : 'transparent',
                                            border: 'none',
                                            textAlign: 'left',
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#f7fbff';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.background = isSelected ? '#eefaff' : 'transparent';
                                        }}
                                    >
                                        <div style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '4px',
                                            border: '2px solid',
                                            borderColor: isSelected ? '#02abff' : '#cbd5e1',
                                            background: isSelected ? '#02abff' : 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            {isSelected && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize: '0.875rem',
                                            color: isSelected ? '#0089d6' : '#374151',
                                            fontWeight: isSelected ? 500 : 400,
                                        }}>
                                            {tag.name}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
