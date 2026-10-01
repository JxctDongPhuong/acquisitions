import 'dotenv/config'; // 1. Tự động nạp các biến môi trường từ file .env vào process.env

import { neon } from '@neondatabase/serverless'; // 2. Driver kết nối Serverless PostgreSQL của Neon qua HTTP
import { drizzle } from 'drizzle-orm/neon-http'; // 3. Adapter tích hợp Drizzle ORM với Neon HTTP driver

// 4. Khởi tạo cổng kết nối (Client Driver) tới Neon PostgreSQL bằng chuỗi URL
const sql = neon(process.env.DATABASE_URL);

// 5. Khởi tạo đối tượng Drizzle ORM (bọc kết nối 'sql' để cung cấp các hàm truy vấn: select, insert, update, delete)
const db = drizzle(sql);

// 6. Xuất 'sql' (kết nối thô) và 'db' (bộ công cụ ORM) để các file khác trong dự án có thể import và sử dụng
export { sql, db };
