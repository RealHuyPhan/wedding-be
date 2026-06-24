# Hướng dẫn chi tiết xây dựng hệ thống Backend (NestJS)

Tài liệu này hướng dẫn chi tiết luồng hoạt động hiện tại của hệ thống, đặc biệt tập trung vào **Cơ chế xác thực bảo mật bằng HttpOnly Cookie** mà dự án đang sử dụng.

---

## 1. Cơ chế xác thực hiện tại (HttpOnly Cookie)
Hệ thống hiện tại **KHÔNG** để Frontend tự do lưu trữ Token (JWT) trong LocalStorage nữa (vì cách đó dễ bị hacker đánh cắp qua mã độc XSS). Thay vào đó, Backend sử dụng cơ chế bảo mật cao hơn: **HttpOnly Cookie**.

**Luồng chạy thực tế:**
1. Frontend gửi Email/Password lên Backend.
2. Backend kiểm tra đúng -> Tạo ra mã `access_token` (JWT).
3. Backend tự động nhét mã `access_token` này vào một chiếc "hộp sắt" gọi là **HttpOnly Cookie** và gửi về cho trình duyệt của người dùng. Trình duyệt tự động cất hộp sắt này đi. (Code JavaScript/React ở Frontend tuyệt đối không thể chạm vào hay đọc được cái hộp này).
4. Backend chỉ trả về cho Frontend thông tin hiển thị cơ bản của user (tên, email, role) để Frontend vẽ giao diện.
5. Ở các lần gọi API tiếp theo, trình duyệt sẽ **tự động** đính kèm chiếc "hộp sắt" (Cookie) đó mang lên Backend. Backend mở hộp ra, thấy có token hợp lệ -> Cho phép đi qua.

---

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

  // 3. Kích hoạt CORS để Frontend (port 3000) có thể gọi sang Backend (port 3001)
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // QUAN TRỌNG: Phải có dòng này thì Frontend mới gửi được Cookie sang Backend
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

---

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
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    // 1. Kiểm tra tài khoản hợp lệ
    const user = await this.authService.validateUser(loginDto);
    
    // 2. Lấy token và data từ Service
    const { access_token, user: userData } = this.authService.login(user);

    // 3. NHÉT TOKEN VÀO HTTP-ONLY COOKIE BẢO MẬT
    res.cookie('access_token', access_token, {
      httpOnly: true, // Frontend JS không thể đọc được
      secure: process.env.NODE_ENV === 'production', // Nếu chạy thật trên mạng thì bắt buộc dùng HTTPS
      sameSite: 'lax', // Chống lỗi CSRF cơ bản
      maxAge: 1000 * 60 * 60 * 24, // Sống được 1 ngày
    });

    // 4. Trả thông tin user sạch sẽ cho Frontend hiển thị UI
    return { message: 'Login successful', user: userData };
  }
```

---

## 4. Chi tiết User Module (`src/user`)

Module này quản lý thao tác CRUD với dữ liệu người dùng.

### 4.1. `src/user/user.service.ts`
Chứa các lệnh thao tác trực tiếp với Database PostgreSQL qua TypeORM.

**Code chi tiết (Trích đoạn hàm findAll):**
```typescript
  async findAll() {
    // Kéo toàn bộ users từ Database
    const users = await this.userRepository.find();
    
    // Quét qua từng user và vứt bỏ trường password đi trước khi trả ra ngoài
    return users.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result; // result chỉ chứa id, email, role, fullName...
    });
  }
```

### 4.2. `src/user/user.controller.ts`
Chứa các API endpoints. 

**Code chi tiết (Trích đoạn phân quyền chặn cập nhật chéo):**
```typescript
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'user')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: { user: { sub: string, role: string } }) {
    // req.user được giải mã tự động từ Token nằm trong Cookie
    const currentUser = req.user;
    
    // Nếu không phải là admin và ID muốn sửa không trùng khớp với ID của bản thân -> Ném lỗi từ chối
    if (currentUser.role !== 'admin' && currentUser.sub !== id) {
      throw new ForbiddenException('You are not allowed to update other users');
    }

    return this.userService.update(id, updateUserDto);
  }
```

---

## 5. Luồng Đăng nhập Google (Google OAuth2 Flow)
Với chức năng Đăng nhập bằng Google, luồng hoạt động có một chút khác biệt do sử dụng cơ chế Redirect của trình duyệt:

1. Frontend chuyển hướng (redirect) người dùng sang API `GET /auth/google`.
2. Backend (thông qua Passport Google Strategy) đưa người dùng sang trang đăng nhập của Google.
3. Sau khi người dùng đồng ý, Google sẽ gọi ngược lại Backend qua endpoint `GET /auth/google/callback`.
4. Tại endpoint callback này, Backend tạo User (hoặc tìm User cũ), sinh ra Token và gắn vào Cookie y hệt như đăng nhập thường.
5. **ĐIỂM KHÁC BIỆT:** Vì đây là một luồng chuyển trang (Navigation), Backend không thể `return` chuỗi JSON thông thường được, mà phải điều hướng (Redirect) người dùng trở lại Frontend.
6. Để Frontend biết được thông tin User (tên, email, role) để hiển thị, Backend sẽ mã hóa object User thành chuỗi Base64 và nhúng vào URL, ví dụ: `http://localhost:3000/login?googleUser=ey...`

**Code chi tiết tại Controller Backend:**
```typescript
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const { access_token, user: userData } = await this.authService.googleLogin(req);

    // Gắn token vào Cookie
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    // Mã hóa thông tin user thành base64 và ném về Frontend qua URL
    const userBase64 = Buffer.from(JSON.stringify(userData)).toString('base64');
    res.redirect(`http://localhost:3000/login?googleUser=${userBase64}`);
  }
```

**Cách Frontend bắt thông tin (React/NextJS):**
Frontend sử dụng `useEffect` để đọc thanh địa chỉ (URL). Nếu thấy tham số `googleUser`, nó sẽ giải mã Base64 và lưu vào Store.
```typescript
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const googleUserBase64 = searchParams.get('googleUser');
    if (googleUserBase64) {
      const decodedString = atob(googleUserBase64);
      const userData = JSON.parse(decodedString);
      login(userData); // Lưu vào Zustand Store
      window.history.replaceState({}, document.title, window.location.pathname); // Xóa URL cho sạch
    }
  }, []);
```

---

## 6. Hướng dẫn chạy & Cấu hình Frontend
Vì Backend sử dụng Cookie, Frontend (Axios) bắt buộc phải cấu hình `withCredentials: true` thì Cookie mới được gửi đi.

**Mẫu code Axios bên Frontend:**
```typescript
const axiosInstance = axios.create({
    baseURL: 'http://localhost:3001/api', // Nhớ trỏ đúng cổng Backend
    withCredentials: true, // BẮT BUỘC ĐỂ TRUYỀN COOKIE
});
```
Lưu ý: Bạn không cần phải lấy token dán vào Header `Authorization: Bearer...` ở Frontend nữa. Trình duyệt sẽ tự động đính kèm Cookie `access_token` vào mọi Request. Backend (thông qua Passport-JWT) sẽ tự động lấy Cookie này ra và xác thực.

---

## 7. Quy chuẩn Phân trang & Tìm kiếm (Pagination & Search)

Để tránh hiện tượng Full Table Scan làm sập cơ sở dữ liệu khi lượng dữ liệu lớn, dự án áp dụng các chuẩn tìm kiếm như sau:

### 7.1. Tìm kiếm đơn giản (Ví dụ: Category)
Được áp dụng cho các bảng có lượng dữ liệu nhỏ (vài chục đến vài trăm dòng).
- Endpoint: `GET /api/category?name=hoa`
- Logic: Sử dụng hàm `ILike('%...%')` có sẵn của TypeORM để tìm kiếm không phân biệt chữ hoa/thường.

### 7.2. Phân trang & Tìm kiếm phức tạp (Ví dụ: User)
Được áp dụng cho các bảng có khả năng sinh ra hàng triệu bản ghi.
- Endpoint: `GET /api/user?page=0&size=10&search=Huy`
- Logic:
  - Khống chế lượng dữ liệu trả về bằng `take` (limit) và `skip` (offset) thông qua `QueryBuilder`.
  - Tính toán các metadata tự động (`totalElements`, `totalPages`, `first`, `last`).
- Định dạng JSON trả về cố định:
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
