import js from '@eslint/js'; // Import bộ quy tắc chuẩn JavaScript của ESLint
import eslintConfigPrettier from 'eslint-config-prettier'; // Import cấu hình tắt các quy tắc ESLint bị trùng/xung đột với Prettier
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'; // Import plugin chạy Prettier trực tiếp bên trong ESLint

export default [
  // 1. Áp dụng cấu hình mặc định được khuyến nghị bởi ESLint
  js.configs.recommended,

  // 2. Tích hợp cấu hình Prettier (tự động bật plugin prettier và tắt các rule xung đột)
  eslintPluginPrettierRecommended,

  // 3. Tắt thêm các quy tắc định dạng có thể xung đột còn sót lại
  eslintConfigPrettier,

  // 4. Cấu hình môi trường và quy tắc riêng cho dự án
  {
    // Áp dụng cấu hình cho tất cả các file JavaScript
    files: ['**/*.js'],

    // Thiết lập ngôn ngữ và môi trường thực thi
    languageOptions: {
      ecmaVersion: 'latest', // Hỗ trợ cú pháp JavaScript mới nhất
      sourceType: 'module', // Hỗ trợ import/export (ES Modules)
      globals: {
        process: 'readonly', // Cho phép sử dụng biến môi trường 'process' của Node.js
        console: 'readonly', // Cho phép sử dụng 'console' (console.log,...)
      },
    },

    // Định nghĩa các quy tắc kiểm tra mã nguồn (Rules)
    rules: {
      'no-unused-vars': 'warn', // Cảnh báo khi có biến khai báo nhưng không dùng
      'no-undef': 'error', // Báo lỗi khi sử dụng biến chưa được khai báo
      'prefer-const': 'error', // Bắt buộc dùng 'const' cho biến không gán lại giá trị
      'no-console': 'off', // Cho phép dùng console.log trong ứng dụng Backend/Node.js
    },
  },

  // 5. Bỏ qua các thư mục không cần kiểm tra
  {
    ignores: ['node_modules/**', 'dist/**'], // Bỏ qua thư mục thư viện và build
  },
];
