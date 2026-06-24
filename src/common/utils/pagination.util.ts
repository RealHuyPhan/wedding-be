import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export interface PageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface Page<T> {
  items: T[];
  page: PageMeta;
}

export async function paginate<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  page: number,
  size: number,
): Promise<Page<T>> {
  queryBuilder.skip(page * size).take(size);
  const [items, totalElements] = await queryBuilder.getManyAndCount();

  const totalPages = Math.ceil(totalElements / size);

  return {
    items,
    page: {
      number: page,
      size: size,
      totalElements: totalElements,
      totalPages: totalPages,
      first: page === 0,
      last: page >= totalPages - 1 || totalElements === 0,
    },
  };
}
