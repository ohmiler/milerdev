export type BlogSearchParamsInput = {
  search?: string | string[];
  tag?: string | string[];
  page?: string | string[];
};

export interface BlogDiscoveryState {
  search: string;
  tag: string;
  page: number;
}

function getSingleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function readBlogDiscoveryState(params: BlogSearchParamsInput): BlogDiscoveryState {
  const search = getSingleParam(params.search).trim();
  const tag = getSingleParam(params.tag).trim() || 'all';
  const requestedPage = Number.parseInt(getSingleParam(params.page) || '1', 10);

  return {
    search,
    tag,
    page: Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1,
  };
}

export function buildBlogHref(params: Partial<BlogDiscoveryState>): string {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.tag && params.tag !== 'all') query.set('tag', params.tag);
  if (params.page && params.page > 1) query.set('page', String(params.page));

  const output = query.toString();
  return output ? `/blog?${output}` : '/blog';
}

export function getBlogRecoveryAction(
  state: BlogDiscoveryState,
  totalResults: number,
): { href: string; label: string } {
  if (totalResults > 0 && state.page > 1) {
    return {
      href: buildBlogHref({ search: state.search, tag: state.tag, page: 1 }),
      label: 'กลับหน้าแรกของผลลัพธ์',
    };
  }

  return { href: '/blog', label: 'ล้างตัวกรอง' };
}
