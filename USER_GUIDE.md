# Hướng dẫn chi tiết xây dựng hệ thống Backend (NestJS)

Tài liệu này hướng dẫn chi tiết luồng hoạt động hiện tại của hệ thống Backend, đặc biệt tập trung vào cơ chế xác thực, cấu trúc Controller/Service và các chuẩn phân trang, xử lý quan hệ dữ liệu.

---

## Mục lục
1. [Cơ chế xác thực (Bearer Token)](#1-cơ-chế-xác-thực-bearer-token)
2. [Cấu hình hệ thống (AppModule & Main)](#2-cấu-hình-hệ-thống-appmodule--main)
3. [Chi tiết Auth Module](#3-chi-tiết-auth-module)
4. [Chi tiết User Module (`src/user`)](#4-chi-tiết-user-module-srcuser)
5. [Luồng Đăng nhập Google (Google OAuth2 Flow)](#5-luồng-đăng-nhập-google-google-oauth2-flow)
6. [Quy chuẩn Phân trang & Tìm kiếm (Pagination & Search)](#6-quy-chuẩn-phân-trang--tìm-kiếm-pagination--search)
7. [Kiến trúc Quan hệ Dữ liệu (TypeORM Relations)](#7-kiến-trúc-quan-hệ-dữ-liệu-typeorm-relations)
8. [Xử lý Logic Nghiệp vụ (Business Logic) & Product Module](#8-xử-lý-logic-nghiệp-vụ-business-logic--product-module)
9. [Chi tiết Category Module (Danh mục) & Auto-Slug](#9-chi-tiết-category-module-danh-mục--auto-slug)
10. [Chi tiết Cart Module (Giỏ hàng) - User & Admin API](#10-chi-tiết-cart-module-giỏ-hàng---user--admin-api)
11. [Chi tiết Order Module (Đơn hàng) & Giao dịch an toàn](#11-chi-tiết-order-module-đơn-hàng--giao-dịch-an-toàn)
12. [Chi tiết Shipping Module (Vận chuyển) & Phân quyền Admin](#12-chi-tiết-shipping-module-vận-chuyển--phân-quyền-admin)
13. [Tích hợp Thanh toán (Payment Integration & Stripe)](#13-tích-hợp-thanh-toán-payment-integration--stripe)

---

## 1. Cơ chế xác thực (Bearer Token)

Hệ thống Backend sử dụng **Bearer Token (JWT)**, trả JWT thẳng vào JSON Body thay vì set Header Set-Cookie. Phương pháp này độc lập và dễ tích hợp cho nhiều Client.

**Luồng chạy:**
1. Client gửi thông tin đăng nhập lên API.
2. Backend kiểm tra tính hợp lệ -> Tạo mã `access_token` (JWT).
3. Backend trả `access_token` về trong Body Response.
4. Ở các API được bảo vệ, Backend (thông qua `JwtStrategy`) sẽ quét Header `Authorization: Bearer <token>`, giải mã và xác thực -> Cấp quyền truy cập. 
*(Lưu ý: `JwtStrategy` trả về cả `id` và `sub` trỏ cùng về 1 giá trị để tương thích với các module khác nhau gọi `req.user.id` hoặc `req.user.sub`)*.

---

## 2. Cấu hình hệ thống (AppModule & Main)

### Cấu hình `src/main.ts`
Đây là nơi cấu hình hệ thống: bật Global Validation, Swagger API Docs, prefix, và CORS. Điểm đặc biệt là **kích hoạt `rawBody: true`** để hỗ trợ xác thực Webhook của Stripe.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // BẮT BUỘC ĐỂ STRIPE WEBHOOK HOẠT ĐỘNG
    rawBody: true,
  });
  
  // Thiết lập Global Prefix
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  
  // Bật Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true
  }));

  // Kích hoạt CORS cho Client gọi vào
  app.enableCors({
    origin: 'http://localhost:3000', // Cho phép Frontend truy cập
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

---

## 3. Chi tiết Auth Module

### 3.1. `auth.service.ts`
Chứa logic kiểm tra password và khởi tạo Token, trả về cả thông tin người dùng.

```typescript
  login(user: Partial<User>) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
```

### 3.2. `auth.controller.ts`
Cung cấp API đăng nhập trả JSON data. Backend không can thiệp Cookie.

---

## 4. Chi tiết User Module (`src/user`)

Module quản lý thao tác CRUD với dữ liệu người dùng qua TypeORM.

### 4.1. Bảo mật Dữ liệu (Security Best Practices)
- **Chống Re-hash Mật khẩu:** Logic băm mật khẩu `bcrypt` được gán vào `@BeforeInsert()` và `@BeforeUpdate()` kết hợp check `!this.password.startsWith('$2b$')`. Chặn sập mật khẩu khi update dữ liệu khác.
- **Chống rò rỉ dữ liệu:** Mọi API (`findAll`, `findOne`...) đều map và gỡ bỏ trường `password` trước khi trả JSON cho Client.
- **Data Integrity:** Kiểm tra trùng Email/Phone và bắn lỗi `ConflictException` (409) kịp thời.

### 4.2. Phân quyền API
Sử dụng tổ hợp `@UseGuards(AuthGuard('jwt'), RolesGuard)` và `@Roles('admin', 'user')` để kiểm soát chặt chẽ quyền truy cập từng endpoint. User thường không thể update role của chính mình.

---

## 5. Luồng Đăng nhập Google (Google OAuth2 Flow)

Với Đăng nhập Google, luồng hoạt động dùng điều hướng (Redirect).
1. Client gọi vào `GET /auth/google`.
2. Passport Google Strategy chuyển hướng tới Google Login.
3. Google redirect trả về `GET /auth/google/callback`.
4. Backend nhận Callback, tạo/tìm User, lấy Token.
5. Backend redirect về URL của Client kèm Token trong query params.

---

## 6. Quy chuẩn Phân trang & Tìm kiếm (Pagination & Search)

Để tối ưu Database, chuẩn tìm kiếm và phân trang được sử dụng qua hàm dùng chung `paginate()`.
Kết quả trả về luôn có cấu trúc:
```json
{
  "items": [{ "id": "..." }],
  "page": {
    "number": 0,
    "size": 10,
    "totalElements": 25,
    "totalPages": 3,
    "first": true,
    "last": false
  }
}
```

---

## 7. Kiến trúc Quan hệ Dữ liệu (TypeORM Relations)

Backend áp dụng các chuẩn thiết kế Database chặt chẽ:

### 7.1. Quan hệ Many-to-Many
Thay vì `category_id` mảng cứng, dùng `@ManyToMany` với `@JoinTable()`. API nhận mảng `categoryIds: string[]` và Service lấy dữ liệu qua ID để map quan hệ: `categoryService.findByIds(categoryIds)`. Ngăn ngừa rác dữ liệu.

### 7.2. Kiểu Decimal Tiền tệ
Trường tài chính (`price`, `shippingFee`) được đặt là `decimal` với `precision: 10, scale: 2` để chống sai số hệ thống.

---

## 8. Xử lý Logic Nghiệp vụ (Business Logic) & Product Module

### 8.1. Data Normalization (Chuẩn hoá dữ liệu)
Backend có nhiệm vụ tự động xử lý và chuẩn hoá các trường dữ liệu trước khi lưu vào DB (như auto-convert sang CamelCase, tạo slug...).

### 8.2. Truy vấn đặc thù (Custom Queries)
Tối ưu Relations & Trả kết quả trực tiếp: Tắt bớt các relation không cần thiết (`relations: { categories: false }`) để phục vụ các luồng chuyên biệt như trang chủ Frontend.

---

## 9. Chi tiết Category Module (Danh mục) & Auto-Slug

Khi tạo mới hoặc cập nhật `label` (tên danh mục), Backend sử dụng hàm `toSlug()` để tự động tạo `value` chuẩn SEO. Điều này giúp tránh việc Client phải tự thiết kế slug. Lỗi trùng lặp sẽ ném ra `ConflictException`.

---

## 10. Chi tiết Cart Module (Giỏ hàng) - User & Admin API

Cart Module (`src/cart`) phân tách rõ ràng API cho Người dùng (User) và Quản trị viên (Admin).
- Các thao tác của user sử dụng `req.user.sub` (hoặc `req.user.id`) được lấy an toàn từ JWT Token. Người dùng không cần gửi `userId` lên qua body.
- Giỏ hàng tự động tính toán tổng tiền `subTotal` động thay vì lưu tĩnh trong database.

---

## 11. Chi tiết Order Module (Đơn hàng) & Giao dịch an toàn

Order Module (`src/order`) quản lý việc chuyển đổi từ Giỏ hàng sang Đơn hàng.

### 11.1. Chống Sai Số Thập Phân (Floating Point Math)
Trong Javascript, `0.1 + 0.2 = 0.30000000000000004`. Mọi phép cộng trừ tiền tệ khi tính `totalAmount` đều được quy đổi ra số nguyên (Cent) bằng cách nhân 100 và dùng `Math.round()`, cộng xong mới chia lại cho 100 để lưu về Database dưới dạng CAD chuẩn.

### 11.2. Transaction An Toàn (Critical Pattern)
Việc chuyển từ Cart sang Order bao gồm nhiều lệnh ghi DB. Tất cả được gói trong `queryRunner.startTransaction()`.
**LƯU Ý QUAN TRỌNG:** Việc giao tiếp với các hệ thống ngoài (như gọi sang Stripe API) TUYỆT ĐỐI không được bỏ vào bên trong khối `try` của Database Transaction.
Lý do: Nếu transaction đã commit thành công (`await queryRunner.commitTransaction()`) mà Stripe API ném lỗi, chương trình nhảy vào `catch` và gọi `rollbackTransaction()`, TypeORM sẽ crash vì transaction đã commit rồi, gây ra `500 Internal Server Error`.

**Chuẩn thiết kế:**
```typescript
    let savedOrder: Order;
    
    // Giai đoạn 1: Lưu trữ Database
    try {
      // Create Order -> Create OrderItems -> Delete Cart Items
      await queryRunner.commitTransaction(); // DONE
    } catch (err) {
      await queryRunner.rollbackTransaction(); 
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Giai đoạn 2: Gọi hệ thống bên ngoài (Stripe)
    try {
      const paymentUrl = await this.paymentService.createPaymentSession(...);
      return { data: { paymentUrl } };
    } catch (stripeErr) {
      throw new BadRequestException("Stripe Error...");
    }
```

---

## 12. Chi tiết Shipping Module (Vận chuyển) & Phân quyền Admin

Bảng `ShippingDestination` lưu trữ thông tin: Quốc gia (`country`), Tỉnh/Bang (`province`), Phí giao hàng (`shippingFee`).
API CRUD bảo vệ qua 2 tầng Guard: `AuthGuard('jwt')` và `RolesGuard` với `@Roles('admin')`.

---

## 13. Tích hợp Thanh toán (Payment Integration & Stripe)

Hệ thống hỗ trợ thanh toán thông qua Module Payment (`src/payment`) áp dụng chuẩn kiến trúc **Adapter Pattern** và **Factory**.

### 13.1. Kiến trúc Adapter
Tất cả cổng thanh toán (ví dụ: Stripe) đều phải implement giao diện `IPaymentGateway` có chứa method `createPaymentSession`. Service chính (`PaymentService`) đóng vai trò là Factory: tuỳ thuộc vào biến `provider` mà nó sẽ gọi đúng Adapter tương ứng mà không phải sửa đổi business logic của Đơn hàng.

### 13.2. Cấu hình Stripe Adapter
Stripe Adapter lấy API Keys từ biến môi trường (`STRIPE_SECRET_KEY`) và khởi tạo danh sách `line_items` chuẩn xác định danh giá (bằng Cent), kèm theo phí Ship (Shipping Fee) được map thành 1 dòng sản phẩm phụ.
Sau đó sinh ra một Checkout URL và trả về cho Frontend điều hướng người dùng.

### 13.3. Xử lý Webhook (Raw Body)
Sau khi thanh toán xong, Stripe tự động gửi sự kiện (ví dụ `checkout.session.completed`) về API Webhook của backend.
- Endpoint: `POST /api/payment/webhook/stripe`
- **Quan trọng:** Webhook của Stripe yêu cầu ký xác thực (Signature Verification). Để làm được việc này, thư viện Stripe cần phần body nguyên thuỷ của request (`Buffer`). Ta sử dụng interface `RawBodyRequest<Request>` cung cấp bởi NestJS (đã bật `rawBody: true` tại `main.ts`).
- Khi xác thực thành công, webhook lấy `orderId` từ metadata và cập nhật trạng thái đơn từ `PENDING_PAYMENT` sang `PROCESSING`.
