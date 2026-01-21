import Link from 'next/link';

interface CourseCardProps {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnailUrl: string | null;
    price: number;
    instructorName: string | null;
    lessonCount: number;
}

export default function CourseCard({
    title,
    slug,
    description,
    thumbnailUrl,
    price,
    instructorName,
    lessonCount,
}: CourseCardProps) {
    return (
        <Link href={`/courses/${slug}`} className="card block overflow-hidden group">
            {/* Thumbnail */}
            <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 relative overflow-hidden">
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                )}

                {/* Price Badge */}
                <div className="absolute top-3 right-3">
                    {price === 0 ? (
                        <span className="bg-green-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                            ฟรี
                        </span>
                    ) : (
                        <span className="bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full">
                            ฿{price.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {title}
                </h3>

                {description && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                        {description}
                    </p>
                )}

                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{lessonCount} บทเรียน</span>
                    </div>

                    {instructorName && (
                        <span className="text-gray-400">โดย {instructorName}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
