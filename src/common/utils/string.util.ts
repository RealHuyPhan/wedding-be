/**
 * Chuyển đổi một chuỗi văn bản thành định dạng camelCase.
 * Ví dụ: "Wedding Dress" -> "weddingDress"
 */
export function toCamelCase(str: string): string {
  if (!str) return '';
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

/**
 * Chuyển đổi một chuỗi văn bản thành định dạng Slug chuẩn SEO.
 * Ví dụ: "Classic & Elegant" -> "classic-elegant"
 */
export function toSlug(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase() // Chuyển thành chữ thường
    .normalize('NFD') // Tách dấu ra khỏi chữ cái (để xử lý tiếng Việt)
    .replace(/[\u0300-\u036f]/g, '') // Xoá dấu tiếng Việt
    .replace(/[đĐ]/g, 'd') // Thay chữ đ
    .replace(/[^a-z0-9\s-]/g, '') // Xoá các ký tự đặc biệt (chỉ giữ lại chữ cái, số, dấu cách, dấu -)
    .replace(/\s+/g, '-') // Đổi dấu cách thành dấu gạch ngang
    .replace(/-+/g, '-') // Gộp nhiều dấu gạch ngang liên tiếp thành 1 dấu
    .replace(/^-+|-+$/g, ''); // Cắt dấu gạch ngang ở đầu và cuối chuỗi
}
