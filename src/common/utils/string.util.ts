/**
 * Chuyển đổi một chuỗi văn bản thành định dạng camelCase.
 * Ví dụ: "Wedding Dress" -> "weddingDress"
 * Hàm này dùng để tự động tạo mã (value) từ tên (label) của dữ liệu.
 */
export function toCamelCase(str: string): string {
  if (!str) return '';
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}
