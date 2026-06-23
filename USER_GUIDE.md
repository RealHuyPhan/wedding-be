# Hướng dẫn chi tiết xây dựng hệ thống Backend (NestJS)

Tài liệu này hướng dẫn chi tiết cách xây dựng hệ thống backend từ con số 0, giải thích từng thư viện, dòng lệnh, cấu trúc thư mục, và **chi tiết chức năng của từng file code** trong các module quan trọng. Bạn có thể sử dụng tài liệu này để hướng dẫn các lập trình viên khác trong team.

---

## 1. Tổng quan công nghệ sử dụng

Hệ thống được xây dựng trên nền tảng Node.js với framework **NestJS**. Các công nghệ chính bao gồm:
- **Framework Core**: NestJS (v11)
- **Ngôn ngữ**: TypeScript
- **Cơ sở dữ liệu**: PostgreSQL
- **ORM**: TypeORM
- **Xác thực (Authentication)**: JWT (JSON Web Token), Passport (Local & Google OAuth2)
- **Mã hóa mật khẩu**: bcrypt
- **Validation**: class-validator, class-transformer

---

## 2. Cài đặt ban đầu

### 2.1. Yêu cầu môi trường
- Node.js (phiên bản 18 trở lên khuyến nghị)
- Npm hoặc Yarn
- PostgreSQL database (hoặc Supabase)

### 2.2. Khởi tạo dự án NestJS
Đầu tiên, cài đặt NestJS CLI (nếu chưa có) và tạo dự án mới:
```bash
npm i -g @nestjs/cli
nest new be
cd be
```

### 2.3. Cài đặt các thư viện cần thiết

Cài đặt TypeORM và PostgreSQL driver:
```bash
npm install @nestjs/typeorm typeorm pg
```

Cài đặt thư viện cấu hình biến môi trường:
```bash
npm install @nestjs/config
```

Cài đặt thư viện hỗ trợ xác thực (Auth, JWT, Google OAuth2):
```bash
npm install @nestjs/passport passport @nestjs/jwt passport-jwt passport-google-oauth20 bcrypt
npm install --save-dev @types/passport-jwt @types/passport-google-oauth20 @types/bcrypt
```

Cài đặt thư viện Validation (kiểm tra dữ liệu đầu vào):
```bash
npm install class-validator class-transformer
```

---

## 3. Cấu hình hệ thống (AppModule & Main)

### 3.1. Cấu hình biến môi trường (.env)
Tạo file `.env` ở thư mục gốc của dự án để lưu các thông tin bảo mật:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/dbname
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### 3.2. Cấu hình `src/app.module.ts`
File này là gốc rễ của ứng dụng, kết nối ConfigModule để đọc `.env` và thiết lập kết nối Database (PostgreSQL) thông qua TypeORM.

### 3.3. Cấu hình `src/main.ts`
Khởi chạy app ở cổng `PORT`, bật ValidationPipe toàn cục để tự động kiểm tra tính hợp lệ của dữ liệu đầu vào từ phía client.

---

## 4. Chi tiết User Module (`src/user`)

Module quản lý toàn bộ dữ liệu, nghiệp vụ liên quan đến người dùng trong hệ thống. Lệnh khởi tạo cơ bản: `nest g resource user`.

### 4.1. `src/user/user.module.ts`
File đóng vai trò khai báo Module.
- Import `TypeOrmModule.forFeature([User])` để kết nối Entity `User` với Database, cho phép sử dụng Repository trong Service.
- Cung cấp `UserController` và `UserService`.
- Export `UserService` ra để các module khác (như AuthModule) có thể gọi tới để kiểm tra người dùng.

### 4.2. `src/user/entities/user.entity.ts`
Định nghĩa mô hình dữ liệu (Schema) của bảng `users` trong Database bằng TypeORM.
- Định nghĩa các cột: `id` (uuid), `email` (unique), `password`, `role`, `fullName`, v.v...
- Các cột có thể bị trống (vì người dùng đăng nhập Google sẽ không có password ban đầu) được thêm cờ `{ nullable: true }`.
- **Đặc biệt**: Chứa các Hook `@BeforeInsert()` và `@BeforeUpdate()` để tự động băm (hash) mật khẩu của user bằng `bcrypt` trước khi lưu xuống DB, đảm bảo tính bảo mật.

### 4.3. `src/user/dto/create-user.dto.ts` & `update-user.dto.ts`
Định nghĩa Data Transfer Object - cấu trúc dữ liệu gửi từ Client lên Server.
- Khai báo các class với thuộc tính mong muốn (`email`, `password`, `phone`...).
- Gắn các decorator xác thực (như `@IsEmail()`, `@IsNotEmpty()`, `@MinLength()`) từ thư viện `class-validator`. Khi client gửi thiếu hoặc sai định dạng (ví dụ email sai, mật khẩu quá ngắn), hệ thống (thông qua Global ValidationPipe trong `main.ts`) sẽ tự động báo lỗi 400 Bad Request ngay lập tức mà không cần tự viết if/else kiểm tra.

### 4.4. `src/user/user.service.ts`
Chứa toàn bộ logic nghiệp vụ (Business logic) liên quan đến CRUD người dùng.
- Inject `Repository<User>` của TypeORM.
- Chứa các hàm: `findAll`, `findOne`, `create`, `update`, `remove`. **Đặc biệt, ở hàm `findAll`, hệ thống sẽ tự động map qua danh sách và dùng Object Destructuring để bóc tách, loại bỏ trường `password` trước khi trả kết quả về, tránh lộ lọt dữ liệu nhạy cảm.**
- Cung cấp thêm hàm `findByEmail` để phục vụ việc xác thực mật khẩu lúc đăng nhập.
- Hàm `createGoogleUser` để tự tạo tự động một user mới nếu họ đăng nhập lần đầu bằng tài khoản Google.

### 4.5. `src/user/user.controller.ts`
Định nghĩa các RESTful API endpoints (như `GET /user`, `POST /user`, `PATCH /user/:id`).
- Lấy request body (thông qua `@Body()`), param (`@Param()`) và truyền vào `UserService` xử lý.
- Có cấu hình phân quyền thông qua Guards: Bọc endpoint bằng `@UseGuards(AuthGuard('jwt'), RolesGuard)` và phân cấp quyền `@Roles('admin')`.
- **Logic chặn cập nhật**: Tại API `PATCH /user/:id`, Controller sẽ trích xuất thông tin người gọi từ Token (`@Request() req`) và tự động kiểm tra. Nếu bạn KHÔNG phải là `admin` và bạn lại đang cố sửa ID của một người khác -> Hệ thống sẽ ném lỗi `403 Forbidden` chặn đứng ngay lập tức. User thông thường chỉ được sửa profile của chính mình.

---

## 5. Chi tiết Auth Module (`src/auth`)

Đây là module quan trọng, xử lý các nghiệp vụ đăng nhập, đăng ký và xác thực mã Token (JWT/Google OAuth). Thư mục chứa rất nhiều cơ chế kỹ thuật sâu.

### 5.1. `src/auth/auth.module.ts`
Đăng ký `JwtModule`, import `PassportModule` và cấu hình hệ thống xác thực.
- Sử dụng `ConfigService` để lấy khoá bí mật `JWT_SECRET` từ file `.env` cấp quyền ký token.
- Import `UserModule` để lấy `UserService` (dùng để tra cứu user khi đăng nhập).
- Đăng ký các Strategy (Cơ chế xác thực): `JwtStrategy`, `GoogleStrategy`.

### 5.2. `src/auth/dto/login.dto.ts`
Định nghĩa cấu trúc dữ liệu cho API đăng nhập (`/auth/login`).
- Yêu cầu bắt buộc phải có `email` đúng định dạng và `password` không bị bỏ trống.

### 5.3. `src/auth/decorators/roles.decorator.ts`
File tự tạo (Custom Decorator).
- Chứa logic để gắn meta data về vai trò (Role) cho API.
- Cú pháp khi dùng: `@Roles('admin', 'user')` trên Controller. Thông tin `['admin', 'user']` sẽ được gắn ẩn vào API đó.

### 5.4. `src/auth/guards/roles.guard.ts`
File tự tạo (Custom Guard).
- Hoạt động kết hợp với `@Roles()`. Guard này chạy trước khi hàm Controller được thực thi.
- Nhiệm vụ: Đọc Role mong muốn (từ meta data ở trên) và so sánh với `user.role` (được giải mã từ Token JWT). Nếu trùng khớp -> Cho qua. Nếu không -> Báo lỗi `403 Forbidden` (Bạn không có quyền).

### 5.5. `src/auth/jwt.strategy.ts`
Khai báo cơ chế bảo vệ API bằng Token (JSON Web Token).
- Kế thừa `PassportStrategy(Strategy, 'jwt')`.
- Cấu hình lấy token từ Header `Authorization: Bearer <token>`.
- Khai báo secret key để giải mã token. Nếu giải mã thành công (không sai key, chưa hết hạn), nó sẽ chạy vào hàm `validate()` trả về payload. Payload này tự động được gán vào biến `request.user` trong các Controller.

### 5.6. `src/auth/google.strategy.ts`
Khai báo cơ chế đăng nhập bằng tài khoản Google (Sử dụng thư viện `passport-google-oauth20`).
- Kế thừa `PassportStrategy(Strategy, 'google')`.
- Truyền vào `clientID`, `clientSecret`, và `callbackURL` lấy từ hệ thống Google Cloud.
- Hàm `validate()` sẽ nhận được Profile từ Google (tên, email, ảnh đại diện) sau khi user cho phép ứng dụng truy cập. Data này sẽ được trả về dạng Object và lưu ở `request.user`.

### 5.7. `src/auth/auth.service.ts`
Xử lý các logic tạo token và xác thực.
- `validateUser()`: Tìm user theo email, so sánh mật khẩu (dùng `bcrypt.compare`). Nếu chuẩn, trả về user (loại bỏ trường password cho an toàn).
- `login(user)`: Đóng gói thông tin user (email, id, role) vào một chuỗi (payload) và dùng `jwtService.sign(payload)` để tạo thành một mã JWT token gửi về client.
- `googleLogin()`: Tiếp nhận Profile từ Google Strategy, nếu email chưa tồn tại trong DB thì gọi user service để tạo mới, sau đó ký JWT token tương tự hàm `login`.

### 5.8. `src/auth/auth.controller.ts`
Cung cấp các API công khai cho Client gọi.
- `POST /auth/login`: Lấy `email`, `password` để đăng nhập.
- `POST /auth/register`: Đăng ký tài khoản mới.
- `GET /auth/google`: API này chỉ gọi Guards `@UseGuards(AuthGuard('google'))` để hệ thống tự động redirect (chuyển hướng) người dùng sang trang Đăng nhập chính thức của Google.
- `GET /auth/google/callback`: Đây là URL mà hệ thống Google sẽ gửi data (Profile của user) về sau khi người dùng đăng nhập thành công ở trang web của Google. API này nhận data đó và gọi sang Auth Service để cấp JWT Token cho người dùng lưu ở Frontend.

---

## 6. Hướng dẫn chạy dự án

1. **Khởi tạo database PostgreSQL** (Cài đặt cục bộ hoặc sử dụng các dịch vụ cloud như Supabase, Render, ElephantSQL).
2. Tạo file `.env` ở thư mục gốc và điền các thông tin (đặc biệt là `DATABASE_URL`).
3. Cài đặt các package (Nếu clone dự án về):
   ```bash
   npm install
   ```
4. Chạy dự án ở chế độ Development:
   ```bash
   npm run start:dev
   ```

Dự án sẽ khởi chạy ở `http://localhost:3000`. Bạn có thể sử dụng Postman để test các endpoint `/auth/login`, `/auth/register` hoặc truy cập trình duyệt vào `http://localhost:3000/auth/google` để test tính năng đăng nhập bằng Google.
