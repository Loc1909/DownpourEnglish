import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '../services/api';
import { User } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => (await userAPI.adminList()).data as User[],
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: 'user' | 'admin' }) => userAPI.adminUpdateRole(id, role),
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: () => toast.error('Cập nhật vai trò thất bại'),
  });

  const toggleRole = (u: User) => {
    const next = u.role === 'admin' ? 'user' : 'admin';
    if (window.confirm(`Đổi vai trò ${u.username} thành ${next}?`)) {
      updateRoleMutation.mutate({ id: u.id, role: next });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quản trị - Người dùng</h1>

      {isLoading ? (
        <div className="py-10 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Username</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map(u => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.id}</td>
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 font-medium">{u.role}</td>
                  <td className="p-3">{new Date(u.date_joined).toLocaleDateString('vi-VN')}</td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => toggleRole(u)}>Đổi vai trò</Button>
                  </td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr><td className="p-4 text-center text-gray-500" colSpan={6}>Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default AdminUsersPage;


