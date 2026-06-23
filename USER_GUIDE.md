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
  
  // 1. Kích hoạt thư viện đọc/ghi Cookie
  app.use(cookieParser());
  
  // 2. Bật Global Pipe để validate DTO
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
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: type Response) {
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

## 5. Hướng dẫn chạy & Cấu hình Frontend
Vì Backend sử dụng Cookie, Frontend (Axios) bắt buộc phải cấu hình `withCredentials: true` thì Cookie mới được gửi đi.

**Mẫu code Axios bên Frontend:**
```typescript
const axiosInstance = axios.create({
    baseURL: 'http://localhost:3001/api', // Nhớ trỏ đúng cổng Backend
    withCredentials: true, // BẮT BUỘC ĐỂ TRUYỀN COOKIE
});
```
Lưu ý: Bạn không cần phải lấy token dán vào Header `Authorization: Bearer...` ở Frontend nữa. Trình duyệt sẽ tự động đính kèm Cookie `access_token` vào mọi Request. Backend (thông qua Passport-JWT) sẽ tự động lấy Cookie này ra và xác thực.
