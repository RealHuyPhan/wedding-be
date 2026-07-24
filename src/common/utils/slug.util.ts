import slugify from 'slugify';
import { Repository, ObjectLiteral } from 'typeorm';

export async function generateUniqueSlug<T extends ObjectLiteral>(
  repository: Repository<T>,
  name: string,
  field: string,
  excludeId?: string,
  defaultBase: string = 'item'
): Promise<string> {
  const baseSlug = slugify(name, { lower: true, strict: true, locale: 'vi' });
  let code = baseSlug || defaultBase;
  let counter = 1;

  while (true) {
    const query = repository.createQueryBuilder('entity')
      .where(`entity.${field} = :code`, { code });

    if (excludeId) {
      query.andWhere('entity.id != :id', { id: excludeId });
    }

    const exists = await query.getOne();
    if (!exists) {
      return code;
    }
    code = `${baseSlug}-${counter}`;
    counter++;
  }
}
