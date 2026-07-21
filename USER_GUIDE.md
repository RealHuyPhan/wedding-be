# HƯỚNG DẪN CHI TIẾT BACKEND (NESTJS)

Tài liệu này mô tả đầy đủ kiến trúc, luồng hoạt động, các quy tắc thiết kế và bảo mật của hệ thống Backend, được xây dựng trên **NestJS** với TypeScript và TypeORM.

> **Xem thêm:** Frontend Guide nằm tại `../fe/USER_GUIDE.md`.

---

## Mục lục

1. [Kiến trúc tổng quan](#1-kiến-trúc-tổng-quan)
2. [Cấu hình hệ thống (AppModule & Main)](#2-cấu-hình-hệ-thống-appmodule--main)
3. [Cơ chế xác thực (JWT Bearer Token)](#3-cơ-chế-xác-thực-jwt-bearer-token)
4. [Auth Module — Đăng nhập & Google OAuth2](#4-auth-module--đăng-nhập--google-oauth2)
5. [User Module — Quản lý tài khoản](#5-user-module--quản-lý-tài-khoản)
6. [Category Module — Danh mục & Auto-Slug](#6-category-module--danh-mục--auto-slug)
7. [Product Module — Sản phẩm](#7-product-module--sản-phẩm)
8. [Cart Module — Giỏ hàng](#8-cart-module--giỏ-hàng)
9. [Order Module — Đơn hàng](#9-order-module--đơn-hàng)
10. [Shipping Module — Cấu hình vùng vận chuyển](#10-shipping-module--cấu-hình-vùng-vận-chuyển)
11. [Payment Module — Tích hợp Stripe](#11-payment-module--tích-hợp-stripe)
12. [Favorite Module — Quản lý Yêu thích](#12-favorite-module--quản-lý-yêu-thích)
13. [Bảo mật (Security Hardening)](#13-bảo-mật-security-hardening)
14. [Chuẩn Phân trang & Tìm kiếm](#14-chuẩn-phân-trang--tìm-kiếm)
15. [Swagger API Docs](#15-swagger-api-docs)

---

## 1. Kiến trúc tổng quan

### Cấu trúc thư mục

```text
be/src/
├── auth/                  # Xác thực, JWT, Google OAuth2
├── user/                  # Quản lý tài khoản người dùng
├── category/              # Danh mục sản phẩm
├── product/               # Sản phẩm
├── cart/                  # Giỏ hàng
├── order/                 # Đơn hàng & Checkout
│   ├── dto/               #   DTO validate request
│   └── entities/          #   TypeORM entities (Order, OrderItem)
├── shipping/              # Cấu hình vùng giao hàng & phí ship
├── payment/               # Cổng thanh toán Stripe
│   └── adapters/          #   Stripe Adapter (Adapter Pattern)
└── common/
    ├── dto/               #   PageOptionsDto dùng chung
    └── utils/             #   paginate() helper
```

### Các module & chức năng chính

| Module | Controller prefix | Mô tả |
|---|---|---|
| `AuthModule` | `/api/auth` | Đăng nhập, Đăng ký, Google OAuth |
| `UserModule` | `/api/user` | CRUD tài khoản (Admin + chính mình) |
| `CategoryModule` | `/api/category` | CRUD danh mục sản phẩm |
| `ProductModule` | `/api/product` | CRUD sản phẩm, Best Sellers |
| `CartModule` | `/api/cart` | Giỏ hàng user, Admin xem abandoned carts |
| `OrderModule` | `/api/order` | Checkout, Lịch sử đơn hàng, CRUD admin |
| `ShippingModule` | `/api/shipping` | Cấu hình vùng giao hàng (Admin) |
| `PaymentModule` | `/api/payment` | Webhook từ Stripe |
| `FavoriteModule` | `/api/favorite` | Danh sách sản phẩm yêu thích (Wishlist) |

### Biến môi trường cần thiết

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=3001
```

---

## 2. Cấu hình hệ thống (AppModule & Main)

### `src/main.ts`

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // BẮT BUỘC để Stripe Webhook xác thực chữ ký
  });

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use(helmet());              // Security Headers (XSS, Clickjacking...)

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,             // Tự động loại bỏ fields không khai báo trong DTO
    forbidNonWhitelisted: true,  // Ném lỗi nếu client gửi fields lạ
    transform: true,             // Tự động parse type (string → number...)
  }));

  // Global Rate Limiting Guard
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new ThrottlerGuard({} as never, {} as never, reflector));

  // CORS — origin đọc từ ENV để linh hoạt khi deploy
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
```

### `src/app.module.ts` — Các module quan trọng

```typescript
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 10 },   // Max 10 req/giây
  { name: 'long', ttl: 60000, limit: 200 },   // Max 200 req/phút
]),

TypeOrmModule.forRootAsync({
  useFactory: (configService) => ({
    type: 'postgres',
    url: configService.get('DATABASE_URL'),
    autoLoadEntities: true,
    // Chỉ auto-sync schema khi KHÔNG ở production (an toàn)
    synchronize: configService.get('NODE_ENV') !== 'production',
    logging: configService.get('NODE_ENV') !== 'production',
    ssl: { rejectUnauthorized: false },
  }),
}),
```

> ⚠️ **Lưu ý Production:** Khi `NODE_ENV=production`, `synchronize` tự động tắt để tránh TypeORM drop column gây mất dữ liệu. Hãy dùng Migration để quản lý schema.

---

## 3. Cơ chế xác thực (JWT Bearer Token)

### Luồng xác thực

```
Client gửi request kèm Header:
  Authorization: Bearer <access_token>
  ↓
JwtStrategy.validate(payload) giải mã token
  ↓
req.user = { id, sub, email, role }
  ↓
AuthGuard('jwt') cho phép đi tiếp
```

### `JwtStrategy` (`src/auth/jwt.strategy.ts`)

```typescript
validate(payload: { sub: string, email: string, role: string }) {
  // Trả về cả 'id' và 'sub' trỏ cùng 1 giá trị
  // để tương thích các controller dùng req.user.id hoặc req.user.sub
  return { id: payload.sub, sub: payload.sub, email: payload.email, role: payload.role };
}
```

### Guards sử dụng trong hệ thống

| Guard | Mục đích |
|---|---|
| `AuthGuard('jwt')` | Yêu cầu đăng nhập hợp lệ |
| `RolesGuard` + `@Roles('admin')` | Chỉ Admin mới được truy cập |
| `ThrottlerGuard` (global) | Rate limiting toàn bộ API |

---

## 4. Auth Module — Đăng nhập & Google OAuth2

### API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập bằng Email/Password |
| `POST` | `/api/auth/register` | Đăng ký tài khoản mới |
| `POST` | `/api/auth/logout` | Đăng xuất (trả thông báo thành công) |
| `GET` | `/api/auth/google` | Redirect sang Google Login |
| `GET` | `/api/auth/google/callback` | Google trả về sau khi login |
| `GET` | `/api/auth/me` | Lấy thông tin user hiện tại |

### Luồng Đăng nhập Email/Password

```
POST /api/auth/login { email, password }
  → AuthService.validateUser() — bcrypt.compare()
  → Nếu đúng: JwtService.sign({ email, sub: id, role })
  → Trả về { access_token, user }
```

### Luồng Google OAuth2

```
GET /api/auth/google
  → Passport Google Strategy → Google Consent Screen
  → GET /api/auth/google/callback (Google redirect về đây)
  → AuthService.googleLogin() — tìm/tạo User trong DB
  → Ký JWT → Redirect sang FRONTEND_URL/auth/callback?token=<jwt>
```

### Bảo mật tại `auth.service.ts`

- **Role bắt buộc khi Register:** `createUserDto.role = 'user'` — Không cho phép client tự chọn role khi đăng ký.
- **Không lộ lý do cụ thể khi login sai:** Lỗi trả về luôn là `"Email or password is incorrect"` (không phân biệt "email sai" hay "password sai" để tránh enumeration attack).

---

## 5. User Module — Quản lý tài khoản

### API Endpoints

| Method | Path | Guard | Mô tả |
|---|---|---|---|
| `POST` | `/api/user` | Admin | Tạo tài khoản thủ công |
| `GET` | `/api/user` | Admin | Danh sách users (có phân trang & tìm kiếm) |
| `GET` | `/api/user/:id` | Admin | Chi tiết user |
| `PATCH` | `/api/user/:id` | User/Admin | Cập nhật profile |
| `DELETE` | `/api/user/:id` | Admin | Xoá tài khoản |

### Bảo mật (`user.service.ts`)

**Chống re-hash mật khẩu:** Entity sử dụng `@BeforeInsert()` + `@BeforeUpdate()`:
```typescript
@BeforeInsert()
@BeforeUpdate()
async hashPassword() {
  if (this.password && !this.password.startsWith('$2b$')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
```
Check `!this.password.startsWith('$2b$')` đảm bảo không re-hash khi update các field khác (không thay đổi password).

**Không rò rỉ password:** Mọi API đều `delete user.password` trước khi trả JSON.

**Chống Mass Assignment (leo quyền):** User thường không thể tự nâng role:
```typescript
if (currentUser.role !== 'admin' && updateUserDto.role) {
  delete updateUserDto.role; // Xoá field role nếu không phải admin
}
```

**Kiểm tra trùng Email/Phone:** Ném `ConflictException` (409) kịp thời.

### Phân biệt tài khoản Auth Provider

Hệ thống hỗ trợ đăng nhập qua Google OAuth. Trong `user.entity.ts`, trường `provider` được sử dụng:
- `provider: 'local'` (mặc định): Các tài khoản tạo qua form Đăng ký (có sử dụng mật khẩu).
- `provider: 'google'`: Tài khoản tự động tạo qua luồng Google (không có mật khẩu). Dựa vào cờ này, Frontend sẽ chủ động ẩn chức năng Đổi mật khẩu.

---

## 6. Category Module — Danh mục & Auto-Slug

### API Endpoints

| Method | Path | Guard | Mô tả |
|---|---|---|---|
| `POST` | `/api/category` | Admin | Tạo danh mục |
| `GET` | `/api/category` | Public | Danh sách danh mục |
| `GET` | `/api/category/:id` | Public | Chi tiết danh mục |
| `PATCH` | `/api/category/:id` | Admin | Cập nhật danh mục |
| `DELETE` | `/api/category/:id` | Admin | Xoá danh mục |

### Tính năng Auto-Slug

Khi tạo hoặc cập nhật `label` (tên danh mục), Service tự động sinh `value` chuẩn SEO bằng hàm `toSlug()`:
```
"Áo Cưới Cao Cấp" → "ao-cuoi-cao-cap"
```
Nếu slug trùng → `ConflictException`. Client không cần tự tạo slug.

---

## 7. Product Module — Sản phẩm

### API Endpoints

| Method | Path | Guard | Mô tả |
|---|---|---|---|
| `POST` | `/api/product` | Admin | Tạo sản phẩm |
| `GET` | `/api/product` | Public | Danh sách (có phân trang, tìm kiếm) |
| `GET` | `/api/product/best-sellers` | Public | Top sản phẩm bán chạy |
| `GET` | `/api/product/:id` | Public | Chi tiết sản phẩm |
| `PATCH` | `/api/product/:id` | Admin | Cập nhật sản phẩm |
| `DELETE` | `/api/product/:id` | Admin | Xoá sản phẩm |

### Quan hệ Many-to-Many với Category

Sản phẩm có thể thuộc nhiều danh mục. DTO nhận `categoryIds: string[]`, Service map sang entities:
```typescript
product.categories = await categoryService.findByIds(categoryIds);
```

### Kiểu dữ liệu tài chính

Trường `price` được lưu kiểu `decimal(10, 2)` để tránh sai số dấu chấm động của JavaScript.

---

## 8. Cart Module — Giỏ hàng

### API Endpoints

| Method | Path | Guard | Mô tả |
|---|---|---|---|
| `GET` | `/api/cart` | User | Xem giỏ hàng |
| `POST` | `/api/cart/items` | User | Thêm sản phẩm |
| `PATCH` | `/api/cart/items/:itemId` | User | Cập nhật số lượng |
| `DELETE` | `/api/cart/items/:itemId` | User | Xoá 1 item |
| `DELETE` | `/api/cart` | User | Xoá toàn bộ giỏ hàng |
| `GET` | `/api/cart/admin/all` | Admin | Xem tất cả abandoned carts |
| `GET` | `/api/cart/admin/:cartId` | Admin | Chi tiết giỏ hàng của 1 user |

### Thiết kế an toàn

- `userId` luôn lấy từ `req.user.sub` (JWT), không bao giờ từ request body → Không ai có thể thao túng giỏ hàng của người khác.
- `updateItemQuantity` và `removeItem` kiểm tra `cart.items.find(i => i.id === itemId)` để đảm bảo item thuộc đúng giỏ hàng của user đang yêu cầu.
- `subTotal` được tính động (không lưu vào DB) để luôn phản ánh giá hiện tại của sản phẩm.
- DTO `AddToCartDto` có `@Min(1)` để chặn số lượng âm hoặc bằng 0.

---

## 9. Order Module — Đơn hàng

### Trạng thái đơn hàng

```
PENDING_PAYMENT → PROCESSING → SHIPPING → DELIVERED → COMPLETED
```

| Trạng thái | Ý nghĩa | Hành động User được phép |
|---|---|---|
| `PENDING_PAYMENT` | Chờ thanh toán | Continue Payment, Edit Shipping, Cancel Order |
| `PROCESSING` | Đang xử lý (đã thanh toán) | Edit Shipping |
| `SHIPPING` | Đang vận chuyển | — |
| `DELIVERED` | Đã giao | — |
| `COMPLETED` | Hoàn tất | — |

### API Endpoints

| Method | Path | Guard | Mô tả |
|---|---|---|---|
| `POST` | `/api/order/checkout` | User | Tạo đơn hàng từ giỏ |
| `GET` | `/api/order/my-orders` | User | Lịch sử đơn hàng của mình |
| `GET` | `/api/order` | Admin | Tất cả đơn hàng (có phân trang) |
| `GET` | `/api/order/:id` | User/Admin | Chi tiết đơn hàng |
| `PATCH` | `/api/order/:id/status` | Admin | Cập nhật trạng thái |
| `PATCH` | `/api/order/:id/shipping` | User | Cập nhật địa chỉ giao hàng |
| `POST` | `/api/order/admin` | Admin | Tạo đơn hàng thủ công |
| `PATCH` | `/api/order/admin/:id` | Admin | Sửa chi tiết đơn (Admin full edit) |
| `DELETE` | `/api/order/:id` | User/Admin | Xoá đơn hàng |

### Luồng Checkout (Chi tiết kỹ thuật)

```
POST /api/order/checkout
  ↓
1. Validate: paymentMethod !== VIA_SOCIAL_MEDIA
2. Bắt đầu DB Transaction (queryRunner)
3. Lấy Cart của User (kèm items và products)
4. Validate Cart không rỗng
5. Tính subTotal bằng Cent (chống floating point): Math.round(price * 100)
6. Tra cứu ShippingDestination theo country + province
7. Tính shippingFee bằng Cent
8. Tạo Order (status = PENDING_PAYMENT)
9. Tạo OrderItems
10. XOÁ giỏ hàng ngay tại đây (chống clone order khi Back từ Stripe)
11. COMMIT Transaction
    ↓
12. Gọi Stripe API ngoài Transaction (createPaymentSession)
13. Lưu paymentUrl vào DB (để Continue Payment sau này)
14. Return { orderId, paymentUrl }
```

> ⚠️ **Tại sao Stripe gọi SAU transaction?** Nếu Stripe lỗi, rollback transaction sẽ crash vì transaction đã commit. Luôn tách 2 giai đoạn: (1) DB operations, (2) External API calls.

### Chống Floating Point khi tính tiền

```typescript
// ❌ Sai: 0.1 + 0.2 = 0.30000000000000004
const total = price * quantity + shippingFee;

// ✅ Đúng: Đổi về Cent, cộng số nguyên, chia lại
const priceCents = Math.round(Number(price) * 100);
const totalCents = priceCents * quantity + shippingFeeCents;
const total = totalCents / 100; // → CAD chuẩn
```

### Bảo vệ quyền sở hữu

**`GET /api/order/:id`** kiểm tra:
- Admin có thể xem mọi đơn.
- User chỉ xem đơn của chính mình (`order.user.id === req.user.id`).
- Tự động tạo `paymentUrl` nếu đơn cũ chưa có (backward compatibility cho Continue Payment).

**`PATCH /api/order/:id/shipping`** kiểm tra:
- Phải là chủ đơn hàng.
- Trạng thái phải là `PENDING_PAYMENT` hoặc `PROCESSING`.

**`DELETE /api/order/:id`** kiểm tra:
- Admin: Xoá thoải mái mọi đơn.
- User: Chỉ xoá đơn của mình VÀ trạng thái phải là `PENDING_PAYMENT`.

---

## 10. Shipping Module — Cấu hình vùng vận chuyển

### Cấu trúc Entity `ShippingDestination`

```typescript
@Entity('shipping_destinations')
export class ShippingDestination {
  country: string;          // Tên quốc gia (VD: "Canada")
  countryCode: string;      // Mã ISO (VD: "CA")
  province: string;         // Tỉnh/Bang (nullable — null = áp dụng toàn quốc)
  provinceCode: string;     // Mã tỉnh (VD: "ON")
  shippingFee: decimal;     // Phí giao hàng (CAD)
}
```

### API Endpoints

| Method | Path | Guard | Mô tả |
|---|---|---|---|
| `POST` | `/api/shipping` | Admin | Tạo vùng vận chuyển |
| `GET` | `/api/shipping` | Public | Danh sách tất cả vùng |
| `GET` | `/api/shipping/:id` | Public | Chi tiết vùng |
| `PATCH` | `/api/shipping/:id` | Admin | Cập nhật phí ship |
| `DELETE` | `/api/shipping/:id` | Admin | Xoá vùng |

### Logic tra cứu phí ship khi Checkout

```typescript
// Ưu tiên tra theo country + province trước
// Nếu không có → tra theo country + province IS NULL (áp dụng cả nước)
const whereCondition = { country: shippingCountry };
if (shippingProvince) {
  whereCondition.province = shippingProvince;
} else {
  whereCondition.province = IsNull();
}
const shippingDest = await manager.findOne(ShippingDestination, { where: whereCondition });
```

---

## 11. Payment Module — Tích hợp Stripe

### Kiến trúc Adapter Pattern

```
PaymentService (Factory)
    └── StripeAdapter implements IPaymentGateway
            └── createPaymentSession(order, items): Promise<string>
```

Nếu sau này cần thêm cổng thanh toán mới (VNPay, Momo...), chỉ cần tạo Adapter mới implement `IPaymentGateway`, không phải sửa code nghiệp vụ.

### `StripeAdapter.createPaymentSession()`

```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [...products, shippingFeeItem],  // Items + phí ship
  mode: 'payment',
  success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${frontendUrl}/orders/${order.id}`, // Về trang chi tiết đơn khi huỷ
  metadata: { orderId: order.id },               // Key để Webhook nhận dạng đơn hàng
  customer_email: order.user?.email,
});
return session.url;
```

### Webhook — Xử lý thanh toán thành công

**Endpoint:** `POST /api/payment/webhook/stripe`
**Guard:** `@SkipThrottle()` — Webhook từ Stripe không bị rate limit.

```typescript
// 1. Xác thực chữ ký từ Stripe (yêu cầu rawBody Buffer)
event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);

// 2. Chỉ xử lý event thanh toán thành công
if (event.type === 'checkout.session.completed') {
  const orderId = session.metadata.orderId;
  order.status = OrderStatus.PROCESSING;  // Cập nhật trạng thái
  await orderRepository.save(order);
}
```

> **Lưu ý:** `rawBody: true` trong `main.ts` là bắt buộc để Stripe Webhook xác thực chữ ký. Nếu thiếu → mọi Webhook đều bị từ chối.

---

## 12. Favorite Module — Quản lý Yêu thích

### API Endpoints

| Method | Path | Guard | Mô tả |
|---|---|---|---|
| `GET` | `/api/favorite` | User | Xem danh sách yêu thích của bản thân |
| `POST` | `/api/favorite` | User | Thêm sản phẩm vào danh sách |
| `DELETE` | `/api/favorite/:productId` | User | Xoá sản phẩm khỏi danh sách |

### Tối ưu hoá Dữ liệu (Select Query)

Để tránh tình trạng "Data Over-fetching", API `GET /api/favorite` sử dụng TypeORM `select` để trích xuất khắt khe các trường thật sự cần thiết cho việc render trên UI (ID, Tên, Giá, Tags, Ảnh Cover), loại bỏ hoàn toàn các trường dữ liệu nặng (Description, cấu hình in ấn, giảm giá...).
Việc này mang lại hiệu suất đáng kể:
- **Giảm I/O Database:** Tăng tốc độ đọc dữ liệu từ ổ cứng / RAM.
- **Giảm Network Payload:** Tiết kiệm vài chục KB JSON cho mỗi sản phẩm trả về, vô cùng hiệu quả với User có wishlist dài.

---

## 13. Bảo mật (Security Hardening)

Hệ thống được thiết kế theo mô hình **Defense in Depth** — nhiều lớp bảo vệ độc lập:

### Lớp 1 — HTTP Security Headers (Helmet)

`app.use(helmet())` tự động thêm các HTTP headers chặn:
- XSS (Cross-Site Scripting)
- Clickjacking (`X-Frame-Options`)
- MIME-type sniffing (`X-Content-Type-Options`)
- Và nhiều loại tấn công phổ biến khác

### Lớp 2 — Rate Limiting (Throttler)

```
10 requests/giây  — Chặn spam/bot
200 requests/phút — Chặn sustained DDoS
```

Stripe Webhook được đánh dấu `@SkipThrottle()` để không bao giờ bị chặn.

### Lớp 3 — Input Validation (ValidationPipe)

```typescript
whitelist: true,            // Bỏ qua các field không khai báo trong DTO
forbidNonWhitelisted: true, // Ném lỗi 400 nếu gửi field lạ
```
Không ai có thể nhét `{ isAdmin: true, role: "admin" }` vào payload.

### Lớp 4 — Phân quyền (Guards)

- `AuthGuard('jwt')` — Xác thực token trước khi vào bất kỳ route được bảo vệ.
- `RolesGuard` + `@Roles('admin')` — Kiểm tra role trong JWT payload.
- Logic tự kiểm tra trong Service (IDOR protection): `order.user.id === req.user.id`.

### Lớp 5 — Business Logic Validation

- Không cho phép User tự gán `role: 'admin'`.
- Không cho phép xoá đơn hàng đã thanh toán.
- Không cho phép sửa địa chỉ sau khi đơn đã ra khỏi trạng thái `PROCESSING`.
- Không cho phép Checkout giỏ hàng rỗng.
- Chống floating point: Tính tiền qua Cent.

---

## 14. Chuẩn Phân trang & Tìm kiếm

### DTO Request

```typescript
// Truyền query params: ?page=0&size=10&search=wedding
class PageOptionsDto {
  page?: number;    // 0-indexed (trang đầu là 0)
  size?: number;    // Số item mỗi trang
  search?: string;  // Từ khoá tìm kiếm
}
```

### Hàm `paginate()` dùng chung

```typescript
queryBuilder.skip(page * size).take(size);
const [items, totalElements] = await queryBuilder.getManyAndCount();
```

### Response chuẩn

```json
{
  "items": [{ "id": "...", "name": "..." }],
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

## 15. Swagger API Docs

Tài liệu API tự động có tại: **`http://localhost:3001/api/docs`**

- Mọi endpoint được đánh dấu `@ApiOperation({ summary, description })`.
- Các endpoint Admin được gắn `@ApiBearerAuth()` và hiển thị rõ yêu cầu token.
- Controller `PaymentController` được đánh dấu `@ApiExcludeController()` (Webhook không cần document công khai).

---

*Tài liệu được cập nhật lần cuối: 2026-07-21*
