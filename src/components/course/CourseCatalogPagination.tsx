import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  buildCourseCatalogHref,
  getCourseCatalogPageItems,
  type CourseCatalogQuery,
} from '@/lib/course-catalog-query';

interface CourseCatalogPaginationProps {
  query: CourseCatalogQuery;
  totalPages: number;
}

export default function CourseCatalogPagination({
  query,
  totalPages,
}: CourseCatalogPaginationProps) {
  if (totalPages <= 1) return null;

  const pageItems = getCourseCatalogPageItems(query.page, totalPages);

  return (
    <Pagination className="mt-10" aria-label="หน้ารายการคอร์ส">
      <PaginationContent className="flex-wrap justify-center">
        {query.page > 1 ? (
          <PaginationItem>
            <PaginationPrevious
              href={buildCourseCatalogHref(query, { page: query.page - 1 })}
              text="ก่อนหน้า"
              aria-label="ไปหน้าก่อนหน้า"
            />
          </PaginationItem>
        ) : null}

        {pageItems.map((item) => (
          <PaginationItem key={item}>
            {typeof item === 'number' ? (
              <PaginationLink
                href={buildCourseCatalogHref(query, { page: item })}
                isActive={item === query.page}
                aria-label={String(item)}
              >
                {item}
              </PaginationLink>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}

        {query.page < totalPages ? (
          <PaginationItem>
            <PaginationNext
              href={buildCourseCatalogHref(query, { page: query.page + 1 })}
              text="ถัดไป"
              aria-label="ไปหน้าถัดไป"
            />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
