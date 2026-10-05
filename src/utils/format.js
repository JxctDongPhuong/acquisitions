export const formatvalidaionsError = (errors) => {
  // Kiểm tra nếu không có lỗi hoặc không chứa danh sách `issues
  if (!errors || !errors.issues) return 'Validation failed';

  // Nếu `issues` là một mảng, trích xuất danh sách các chuỗi thông báo lỗi (message)
  if (Array.isArray(errors.issues)) {
    return errors.issues.map((issue) => issue.message);
  }

  // Nếu `issues` là một đối tượng, chuyển đổi thành chuỗi JSON
  return JSON.stringify(errors.issues);
};
