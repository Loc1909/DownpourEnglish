// src/pages/AdminHomePage.tsx

import React from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { Link } from 'react-router-dom';

const AdminHomePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bảng điều khiển Admin</h1>
        <p className="text-gray-600 mt-1">Quản trị nội dung và tính năng hệ thống</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card title="Chủ đề">
          <p className="text-gray-600 mb-4">Tạo, chỉnh sửa và xóa chủ đề học.</p>
          <Link to="/admin/topics">
            <Button>Quản lý chủ đề</Button>
          </Link>
        </Card>

        {/* Chỗ để mở rộng các module quản trị khác sau này */}
        <Card title="Sắp ra mắt">
          <p className="text-gray-600">Trang quản trị khác sẽ được bổ sung sau.</p>
        </Card>
      </div>
    </div>
  );
};

export default AdminHomePage;


