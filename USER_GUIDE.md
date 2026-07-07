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

---

## 1. Cơ chế xác thực (Bearer Token)

Hệ thống Backend sử dụng **Bearer Token (JWT)**, trả JWT thẳng vào JSON Body thay vì set Header Set-Cookie. Phương pháp này độc lập và dễ tích hợp cho nhiều Client.

**Luồng chạy:**
1. Client gửi thông tin đăng nhập lên API.
2. Backend kiểm tra tính hợp lệ -> Tạo mã `access_token` (JWT).
3. Backend trả `access_token` về trong Body Response.
4. Ở các API được bảo vệ, Backend (thông qua `JwtStrategy`) sẽ quét Header `Authorization: Bearer <token>`, giải mã và xác thực -> Cấp quyền truy cập.

---

## 2. Cấu hình hệ thống (AppModule & Main)

### Cấu hình `src/main.ts`
Đây là nơi cấu hình hệ thống: bật Global Validation, Swagger API Docs, prefix, và CORS.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Thiết lập Global Prefix
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  
  // Bật Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true
  }));

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Wedding API')
    .setDescription('API documentation for the Wedding system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

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

```typescript
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const validatedUser = await this.authService.validateUser(loginDto);
    const { access_token, user } = this.authService.login(validatedUser);

    return {
      message: 'Login successful',
      user: {
        email: user.email,
        role: user.role,
        name: user.name
      },
      access_token
    };
  }
```

---

## 4. Chi tiết User Module (`src/user`)

Module quản lý thao tác CRUD với dữ liệu người dùng qua TypeORM.

### 4.1. Bảo mật Dữ liệu (Security Best Practices)
- **Chống Re-hash Mật khẩu:** Logic băm mật khẩu `bcrypt` được gán vào `@BeforeInsert()` và `@BeforeUpdate()` kết hợp check `!this.password.startsWith('$2b$')`. Chặn sập mật khẩu khi update dữ liệu khác.
- **Chống rò rỉ dữ liệu:** Mọi API (`findAll`, `findOne`...) đều map và gỡ bỏ trường `password` trước khi trả JSON cho Client.
- **Data Integrity:** Kiểm tra trùng Email/Phone và bắn lỗi `ConflictException` (409) kịp thời.

### 4.2. Phân quyền API
```typescript
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'user')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: { user: { sub: string, role: string } }) {
    const currentUser = req.user;

    // Only current user or admin can update profile
    if (currentUser.role !== 'admin' && currentUser.sub !== id) {
      throw new ForbiddenException('You are not allowed to update other users');
    }

    // Prevent regular users from elevating their own privileges
    if (currentUser.role !== 'admin' && updateUserDto.role) {
      delete updateUserDto.role;
    }

    return this.userService.update(id, updateUserDto);
  }
```

---

## 5. Luồng Đăng nhập Google (Google OAuth2 Flow)

Với Đăng nhập Google, luồng hoạt động dùng điều hướng (Redirect).

1. Client gọi vào `GET /auth/google`.
2. Passport Google Strategy chuyển hướng tới Google Login.
3. Google redirect trả về `GET /auth/google/callback`.
4. Backend nhận Callback, tạo/tìm User, lấy Token.
5. Backend redirect về URL của Client kèm Token trong query params: `?status=success&token=eyJ...`.

```typescript
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: { user: { email: string; firstName: string; lastName: string; picture?: string; accessToken?: string } },
    @Res() res: Response
  ) {
    const { access_token } = await this.authService.googleLogin(req);

    res.redirect(`http://localhost:3000/auth/callback?status=success&token=${access_token}`);
  }
```

---

## 6. Quy chuẩn Phân trang & Tìm kiếm (Pagination & Search)

Để tối ưu Database, chuẩn tìm kiếm và phân trang được sử dụng qua hàm dùng chung `paginate()`.

### Cách code Phân trang chuẩn (DRY Pattern)
1. **Tại Controller:** Sử dụng `PageOptionsDto` để hứng tham số URL.
```typescript
  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.myService.findAll(pageOptionsDto);
  }
```

2. **Tại Service:** Khởi tạo `QueryBuilder` và gọi `paginate()`.
```typescript
  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.myRepository.createQueryBuilder('alias');

    if (search) {
      queryBuilder.where('alias.name ILIKE :search', { search: `%${search}%` });
    }

    return await paginate(queryBuilder, page, size);
  }
```
**JSON kết quả chuẩn:**
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
Thay vì `category_id` mảng cứng, dùng `@ManyToMany` với `@JoinTable()`.
- API nhận mảng `categoryIds: string[]`.
- Service lấy dữ liệu qua ID để map quan hệ: `categoryService.findByIds(categoryIds)`. Ngăn ngừa rác dữ liệu.

### 7.2. Kiểu Decimal Tiền tệ
Trường tài chính (`price`, `discountPrice`) được đặt là `decimal` để chống sai số hệ thống.
```typescript
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;
```

---

## 8. Xử lý Logic Nghiệp vụ (Business Logic) & Product Module

Các logic nghiệp vụ quan trọng thường được đặt trực tiếp trong các Service (như `ProductService`) để tái sử dụng và kiểm soát luồng dữ liệu một cách linh hoạt.

### 8.1. Data Normalization (Chuẩn hoá dữ liệu)
Backend có nhiệm vụ tự động xử lý và chuẩn hoá các trường dữ liệu trước khi lưu vào DB, nhằm giảm tải cho Frontend. 
- **Ví dụ:** Khi tạo hoặc cập nhật `Product` mà có thay đổi `label` (tên sản phẩm), Backend sẽ tự động gọi hàm helper (như `toCamelCase`) để convert `label` thành `value` (mã định danh duy nhất) trước khi gán vào Entity.

### 8.2. Truy vấn đặc thù (Custom Queries)
Dù hệ thống có bộ phân trang chuẩn (Pagination), một số API giao diện khách hàng (Storefront) vẫn cần được thiết kế trả về dạng payload tùy biến để tối ưu tốc độ và UI.
- **Tối ưu Relations & Trả kết quả trực tiếp:** Trong `findBestSeller`, thay vì dùng pagination chuẩn, hệ thống thiết lập giới hạn cứng `take: 4`, tắt bớt các relation không cần thiết (`relations: { categories: false }`), và trả thẳng dữ liệu `{ data: hotItem }` để phục vụ riêng cho Frontend Section "Best Sellers". Điều này giảm đáng kể chi phí truy vấn SQL và network payload.

---

## 9. Chi tiết Category Module (Danh mục) & Auto-Slug

Module Category (`src/category`) hỗ trợ phân loại sản phẩm. Đặc điểm nổi bật là tự động tạo mã định danh (slug).

### 9.1. Tự động sinh `value` (Slug)
Khi tạo mới hoặc cập nhật `label` (tên danh mục), Backend sử dụng hàm `toSlug()` để tự động tạo `value` chuẩn SEO. Điều này giúp tránh việc Client phải tự thiết kế slug.
```typescript
  // Tự động sinh mã 'value' từ 'label' (dùng Slug chuẩn SEO)
  const value = toSlug(createCategoryDto.label);

  // Kiểm tra trùng lặp
  const existingCategory = await this.categoryRepository.findOne({ where: { value } });
  if (existingCategory) {
    throw new ConflictException("Category already exists");
  }
```

### 9.2. API riêng biệt phục vụ Frontend
- **Pagination chuẩn:** API `findAll` sử dụng pagination chuẩn với `PageOptionsDto`.
- **Giao diện trang chủ (Home Page):** Sử dụng API riêng `categoryHomePage()` trả về trực tiếp mảng dữ liệu (giới hạn `take: 8`) giúp tối ưu tốc độ load trên trang chủ.

---

## 10. Chi tiết Cart Module (Giỏ hàng) - User & Admin API

Cart Module (`src/cart`) quản lý giỏ hàng của người dùng, phân tách rõ ràng API cho Người dùng (User) và Quản trị viên (Admin).

### 10.1. Bảo mật User Cart
Các thao tác của user như thêm, sửa, xoá giỏ hàng đều sử dụng `@UseGuards(AuthGuard('jwt'))` và trích xuất `userId` từ token (`req.user.sub`). Người dùng không cần gửi `userId` lên, giúp bảo mật và tránh can thiệp chéo dữ liệu.
```typescript
  @UseGuards(AuthGuard('jwt'))
  @Post('items')
  addToCart(@Request() req: RequestWithUser, @Body() addToCartDto: AddToCartDto) {
    const userId = req.user.sub;
    return this.cartService.addToCart(userId, addToCartDto);
  }
```

### 10.2. Tính toán Động (Dynamic Calculation)
- **Tổng tiền (`subTotal`):** Tổng tiền của giỏ hàng được tính toán động (on-the-fly) khi truy vấn (lấy giá sản phẩm hiện tại nhân với số lượng), tránh lưu dư thừa dữ liệu vào DB.
- **Sản phẩm gợi ý:** API lấy giỏ hàng (`getMyCart`) còn đính kèm thêm `suggestedProducts` (lấy từ best sellers) vào response giúp frontend dễ dàng hiển thị phần "Có thể bạn cũng thích".

### 10.3. Admin API (Marketing & Abandoned Carts)
Cung cấp API cho Admin quản lý các giỏ hàng đang bị bỏ quên (có chứa item nhưng chưa thanh toán) để hỗ trợ chiến dịch Marketing (gửi email nhắc nhở).
```typescript
  // Lấy những giỏ hàng có ít nhất 1 item bên trong (đang bị bỏ quên)
  const queryBuilder = this.cartRepository.createQueryBuilder('cart')
    .innerJoin('cart.items', 'items') // Chỉ lấy nếu có JOIN thành công với items
```
