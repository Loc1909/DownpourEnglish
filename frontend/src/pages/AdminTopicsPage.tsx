// src/pages/AdminTopicsPage.tsx

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topicsAPI } from '../services/api';
import { Topic } from '../types';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const AdminTopicsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['adminTopics'],
    queryFn: async () => {
      const res = await topicsAPI.getAll({ page: 1, page_size: 100 });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: topicsAPI.create,
    onSuccess: () => {
      toast.success('Tạo chủ đề thành công');
      queryClient.invalidateQueries({ queryKey: ['adminTopics'] });
      setIsOpen(false);
      setForm({ name: '', description: '', icon: '' });
    },
    onError: () => toast.error('Tạo chủ đề thất bại'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Pick<Topic, 'name' | 'description' | 'icon'>> }) =>
      topicsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Cập nhật chủ đề thành công');
      queryClient.invalidateQueries({ queryKey: ['adminTopics'] });
      setIsOpen(false);
      setEditing(null);
    },
    onError: () => toast.error('Cập nhật chủ đề thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => topicsAPI.delete(id),
    onSuccess: () => {
      toast.success('Xóa chủ đề thành công');
      queryClient.invalidateQueries({ queryKey: ['adminTopics'] });
    },
    onError: () => toast.error('Xóa chủ đề thất bại'),
  });

  const topics = useMemo(() => data?.results ?? [], [data]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', icon: '' });
    setIsOpen(true);
  };

  const openEdit = (topic: Topic) => {
    setEditing(topic);
    setForm({ name: topic.name, description: topic.description, icon: topic.icon });
    setIsOpen(true);
  };

  const onSubmit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Quản lý chủ đề</h1>
        <Button onClick={openCreate}>Tạo chủ đề</Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Tên</th>
              <th className="text-left p-3">Mô tả</th>
              <th className="text-left p-3">Icon</th>
              <th className="text-right p-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t: Topic) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{t.name}</td>
                <td className="p-3">{t.description}</td>
                <td className="p-3">{t.icon}</td>
                <td className="p-3 text-right space-x-2">
                  <Button variant="secondary" onClick={() => openEdit(t)}>Sửa</Button>
                  <Button variant="danger" onClick={() => deleteMutation.mutate(t.id)}>Xóa</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'Sửa chủ đề' : 'Tạo chủ đề'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Icon</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>Hủy</Button>
            <Button onClick={onSubmit} isLoading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Lưu' : 'Tạo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminTopicsPage;


