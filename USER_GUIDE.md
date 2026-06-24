# Hướng dẫn chi tiết xây dựng hệ thống Backend (NestJS)

Tài liệu này hướng dẫn chi tiết luồng hoạt động hiện tại của hệ thống, đặc biệt tập trung vào **Cơ chế xác thực bảo mật bằng Bearer Token** mà dự án đang sử dụng.

---

## Mục lục
1. [Cơ chế xác thực hiện tại (Bearer Token)](#1-cơ-chế-xác-thực-hiện-tại-bearer-token)
2. [Cấu hình hệ thống (AppModule & Main)](#2-cấu-hình-hệ-thống-appmodule--main)
3. [Chi tiết Auth Module (Xác thực và Cookie)](#3-chi-tiết-auth-module-xác-thực-và-cookie)
4. [Chi tiết User Module (`src/user`)](#4-chi-tiết-user-module-srcuser)
5. [Luồng Đăng nhập Google (Google OAuth2 Flow)](#5-luồng-đăng-nhập-google-google-oauth2-flow)
6. [Hướng dẫn chạy & Cấu hình Frontend](#6-hướng-dẫn-chạy--cấu-hình-frontend)
7. [Quy chuẩn Phân trang & Tìm kiếm (Pagination & Search)](#7-quy-chuẩn-phân-trang--tìm-kiếm-pagination--search)

<div style="page-break-after: always;"></div>

## 1. Cơ chế xác thực hiện tại (Bearer Token)

Hệ thống hiện tại sử dụng **Bearer Token (JWT)**. Phương pháp này đặc biệt linh hoạt, dễ tích hợp cho các nền tảng khác nhau (Web, Mobile App) và không bị phụ thuộc vào tính năng Cookie của trình duyệt. 

**Luồng chạy thực tế:**
1. Frontend gửi Email/Password lên Backend.
2. Backend kiểm tra đúng -> Tạo ra mã `access_token` (JWT).
3. Backend trả mã `access_token` này về thẳng trong Body của Response (dạng JSON).
4. Phía Frontend sẽ bắt lấy token này và chủ động lưu trữ (vào LocalStorage hoặc Cookie do FE tự quản lý).
5. Ở các lần gọi API tiếp theo, Frontend sẽ tự động đính kèm Token vào Header của Request: `Authorization: Bearer <token>`.
6. Backend (thông qua `JwtStrategy`) sẽ lấy Token từ Header này, giải mã và xác thực -> Cho phép đi qua.

<div style="page-break-after: always;"></div>

## 2. Cấu hình hệ thống (AppModule & Main)

### 2.1. Cấu hình `src/main.ts`
Đây là nơi khởi chạy app, bật Validation và cấu hình để hệ thống hỗ trợ Cookie & CORS.

**Code chi tiết:**
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. Thiết lập Global Prefix cho mọi API (thành /api/...)
  app.setGlobalPrefix('api');

  // 2. Kích hoạt thư viện đọc/ghi Cookie
  app.use(cookieParser());
  
  // 3. Bật Global Pipe để validate DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true
  }));

  // 4. Kích hoạt CORS để Frontend (port 3000) có thể gọi sang Backend (port 3001)
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // QUAN TRỌNG: Phải có dòng này thì Frontend mới gửi được Cookie sang Backend
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

<div style="page-break-after: always;"></div>

## 3. Chi tiết Auth Module (Xác thực và Cookie)

### 3.1. `src/auth/auth.service.ts`
Chứa logic kiểm tra password và khởi tạo Token, trả về cả thông tin người dùng.

**Code chi tiết (Trích đoạn quan trọng):**
```typescript
  login(user: Partial<User>) {
    // 1. Tạo cục hàng payload chứa thông tin cơ bản
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    // 2. Ký tạo Token và trả về thông tin
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        // Dùng Optional Chaining (?.) để chống lỗi sập web nếu email bị undefined
        name: user.fullName || user.email?.split('@')[0] || 'User',
      }
    };
  }
```

### 3.2. `src/auth/auth.controller.ts`
Cung cấp API cho Frontend. Đây là nơi thao tác ghi Cookie diễn ra. Nhờ biến `@Res({ passthrough: true }) res: Response`, ta có thể can thiệp vào Header trả về của Express.

**Code chi tiết (Trích đoạn hàm login):**
```typescript
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // 1. Kiểm tra tài khoản hợp lệ
    const user = await this.authService.validateUser(loginDto);
    
    // 2. Lấy token và data từ Service
    const { access_token, user: userData } = this.authService.login(user);

    // 3. Trả về Token và thông tin user cho Frontend tự quản lý
    return { message: 'Login successful', user: userData, access_token };
  }
```

**Code chi tiết (Trích đoạn hàm logout):**
Đây là API quan trọng để xóa bỏ token khi người dùng đăng xuất.
```typescript
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout() {
    // Với Bearer Token, Backend không cần làm gì cả. 
    // Frontend tự xóa token trong bộ nhớ/cookie của nó là xong.
    return { message: 'Logged out successfully' };
  }
```

<div style="page-break-after: always;"></div>

## 4. Chi tiết User Module (`src/user`)

Module này quản lý thao tác CRUD với dữ liệu người dùng.

### 4.1. `src/user/user.service.ts`
Chứa các lệnh thao tác trực tiếp với Database PostgreSQL qua TypeORM.

**Code chi tiết (Trích đoạn hàm findAll):**
```typescript
  async findAll(pageOptionsDto: PageOptionsDto) {
    // Sử dụng generic paginate() để tính skip/take/meta data
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const paginatedResult = await paginate(queryBuilder, page, size);
    
    // Quét qua từng user và vứt bỏ trường password đi trước khi trả ra ngoài
    paginatedResult.items = paginatedResult.items.map(user => {
      const { password, ...result } = user;
      return result as User; // result chỉ chứa id, email, role, fullName...
    });

    return paginatedResult;
  }
```

### 4.2. `src/user/user.controller.ts`
Chứa các API endpoints. 

**Code chi tiết (Trích đoạn phân quyền chặn cập nhật chéo):**
```typescript
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'user')
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateUserDto: UpdateUserDto, 
    @Request() req: { user: { sub: string, role: string } }
  ) {
    // req.user được giải mã tự động từ Token nằm trong Cookie
    const currentUser = req.user;
    
    // Ném lỗi nếu không phải là admin và ID muốn sửa không trùng khớp
    if (currentUser.role !== 'admin' && currentUser.sub !== id) {
      throw new ForbiddenException('You are not allowed to update other users');
    }

    return this.userService.update(id, updateUserDto);
  }
```

<div style="page-break-after: always;"></div>

## 5. Luồng Đăng nhập Google (Google OAuth2 Flow)

Với chức năng Đăng nhập bằng Google, luồng hoạt động có một chút khác biệt do sử dụng cơ chế Redirect của trình duyệt:

1. Frontend chuyển hướng (redirect) người dùng sang API `GET /auth/google`.
2. Backend (thông qua Passport Google Strategy) đưa người dùng sang trang đăng nhập của Google.
3. Sau khi đồng ý, Google sẽ gọi ngược lại Backend qua endpoint `GET /auth/google/callback`.
4. Tại endpoint callback này, Backend tạo User (hoặc tìm User cũ), sinh ra Token.
5. **ĐIỂM KHÁC BIỆT:** Vì đây là một luồng chuyển trang (Navigation), Backend không thể `return` chuỗi JSON thông thường được, mà phải điều hướng (Redirect) người dùng trở lại Frontend.
6. Để Frontend nhận được Token, Backend sẽ đính kèm Token vào URL: `http://localhost:3000/auth/callback?status=success&token=eyJ...`. Frontend sẽ tự móc token này xuống và lưu lại.

**Code chi tiết tại Controller Backend:**
```typescript
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const { access_token } = await this.authService.googleLogin(req);

    // Redirect về Frontend kèm Token
    res.redirect(`http://localhost:3000/auth/callback?status=success&token=${access_token}`);
  }

  // API để Frontend lấy thông tin sau khi Redirect thành công
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req: any) {
    return this.authService.getUserProfile(req.user.sub);
  }
```

**Cách Frontend bắt thông tin (React/NextJS):**
Frontend sử dụng `useEffect` để đọc thanh địa chỉ (URL) ở trang `/auth/callback`. Nếu có `token`, FE sẽ lưu nó vào Cookie bằng thư viện `js-cookie` (để dùng như Bearer token), xoá token khỏi URL cho an toàn, và gọi `GET /api/auth/me`.
```typescript
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      Cookies.set('access_token', token, { path: '/' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    authService.getMe().then(...);
  }, []);
```

<div style="page-break-after: always;"></div>

## 6. Hướng dẫn chạy & Cấu hình Frontend

Vì hệ thống sử dụng Bearer Token, Frontend cần tự động lấy Token và nhét vào Request Header trước khi gọi API.

**Mẫu code Axios bên Frontend:**
```typescript
import Cookies from 'js-cookie';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3001/api',
});

// Axios Interceptor tự động nhét Token vào Header
axiosInstance.interceptors.request.use((config) => {
    const token = Cookies.get('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

> **Tuyệt chiêu:** Dù dùng Bearer Token, Frontend vẫn lưu token vào file Cookie (bằng thư viện `js-cookie`) thay vì `LocalStorage`. Lý do là để file Vệ sĩ `middleware.ts` của Next.js (chạy trên Server) vẫn có thể đọc được Token đó một cách dễ dàng để bảo vệ trang `/admin`!

<div style="page-break-after: always;"></div>

## 7. Quy chuẩn Phân trang & Tìm kiếm (Pagination & Search)

Để tránh hiện tượng Full Table Scan làm sập cơ sở dữ liệu khi lượng dữ liệu lớn, dự án áp dụng các chuẩn tìm kiếm như sau:

### 7.1. Tìm kiếm & Phân trang đa trường (Ví dụ: Category)
Được áp dụng cho các API lấy danh sách thông thường. Tham số `search` được cấu hình để quét qua nhiều trường (như `name` và `description`).
- **Endpoint:** `GET /api/category?page=0&size=10&search=hoa`
- **Logic:** 
  - Khởi tạo `QueryBuilder`.
  - Nếu có `search`, dùng `ILIKE` quét qua `name` hoặc `description`.
  - Truyền `QueryBuilder` vào hàm tiện ích `paginate()` để tự động sinh ra kết quả phân trang chuẩn.

**Code chi tiết (Trích đoạn `CategoryService`):**
```typescript
  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (search) {
      queryBuilder.where(
        '(category.name ILIKE :search or category.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Tự động tính toán tổng số phần tử và số trang
    const paginatedResult = await paginate(queryBuilder, page, size);
    return paginatedResult;
  }
```

### 7.2. Phân trang & Xử lý bảo mật (Ví dụ: User)
Được áp dụng khi dữ liệu có chứa thông tin nhạy cảm (như `password`).
- **Endpoint:** `GET /api/user?page=0&size=10&search=Huy`
- **Logic:**
  - Tương tự như Category, nhưng sau khi lấy được `paginatedResult`, ta map qua mảng `items` để gỡ bỏ trường `password` trước khi trả về cho Client.
- **Định dạng JSON trả về cố định:**

```json
{
  "items": [
    { "id": "...", "fullName": "..." }
  ],
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

- **Tối ưu hóa Database (PostgreSQL):** PostgreSQL được thiết lập kích hoạt extension `pg_trgm` và sử dụng chỉ mục loại `GIN Index` trên các trường thường xuyên bị tìm kiếm tương đối (ví dụ `fullName`) để đảm bảo tốc độ cực nhanh.

### 7.3. Cách code Phân trang chuẩn (DRY Pattern)
Thay vì code lặp lại logic tính toán ở mọi Module (User, Category, Product), dự án đã quy chuẩn hóa toàn bộ code phân trang thành tiện ích dùng chung (Common Utility).

**Quy tắc khi tạo API phân trang mới:**
1. **Tại Controller:** Sử dụng `PageOptionsDto` để tự động hứng và ép kiểu các tham số URL (`page`, `size`, `search`).
```typescript
  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.myService.findAll(pageOptionsDto);
  }
```

2. **Tại Service:** Khởi tạo `QueryBuilder`, xử lý tìm kiếm tương đối, và gọi hàm `paginate()` dùng chung.
```typescript
  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page, size, search } = pageOptionsDto;
    const queryBuilder = this.myRepository.createQueryBuilder('entityAlias');

    if (search) {
      queryBuilder.where('entityAlias.name ILIKE :search', { search: `%${search}%` });
    }

    // Tự động tính skip, take, totalElements, totalPages và format JSON chuẩn
    return await paginate(queryBuilder, page, size);
  }
```
