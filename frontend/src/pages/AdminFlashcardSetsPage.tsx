// src/pages/AdminFlashcardSetsPage.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { flashcardSetsAPI, topicsAPI } from '../services/api';
import { FlashcardSet, Topic } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const AdminFlashcardSetsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [q, setQ] = useState('');
  const [topicId, setTopicId] = useState<number | ''>('');
  const [creatorId, setCreatorId] = useState<number | ''>('');
  const [isPublic, setIsPublic] = useState<'' | 'true' | 'false'>('');

  const { data: topicsData } = useQuery({
    queryKey: ['adminTopicsOptions'],
    queryFn: async () => (await topicsAPI.getAll({ page: 1, page_size: 100 })).data,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminFlashcardSets', q, topicId, creatorId, isPublic],
    queryFn: async () => {
      const res = await flashcardSetsAPI.adminList({
        q: q || undefined,
        topic_id: topicId ? Number(topicId) : undefined,
        creator_id: creatorId ? Number(creatorId) : undefined,
        is_public: isPublic === '' ? undefined : isPublic === 'true',
      });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => flashcardSetsAPI.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa bộ flashcard');
      queryClient.invalidateQueries({ queryKey: ['adminFlashcardSets'] });
    },
    onError: () => toast.error('Xóa thất bại'),
  });

  const topics: Topic[] = topicsData?.results ?? [];
  const sets: FlashcardSet[] = useMemo(() => data ?? [], [data]);

  const onDelete = (id: number) => {
    if (window.confirm('Xóa bộ flashcard này?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quản trị - Bộ Flashcard</h1>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tiêu đề"
            className="border rounded px-3 py-2"
          />
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : '')}
            className="border rounded px-3 py-2"
          >
            <option value="">Tất cả chủ đề</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            type="number"
            value={creatorId as any}
            onChange={(e) => setCreatorId(e.target.value ? Number(e.target.value) : '')}
            placeholder="Creator ID"
            className="border rounded px-3 py-2"
          />
          <select
            value={isPublic}
            onChange={(e) => setIsPublic(e.target.value as any)}
            className="border rounded px-3 py-2"
          >
            <option value="">Tất cả</option>
            <option value="true">Công khai</option>
            <option value="false">Riêng tư</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => refetch()}>Lọc</Button>
          <Button as={Link} to="/create-flashcard-set">Tạo bộ mới</Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="py-10 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Tiêu đề</th>
                <th className="p-3">Chủ đề</th>
                <th className="p-3">Creator</th>
                <th className="p-3">Công khai</th>
                <th className="p-3">Thẻ</th>
                <th className="p-3">Lưu</th>
                <th className="p-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {sets.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.id}</td>
                  <td className="p-3 font-medium">{s.title}</td>
                  <td className="p-3">{s.topic?.name}</td>
                  <td className="p-3">{s.creator?.username}</td>
                  <td className="p-3">{s.is_public ? 'Có' : 'Không'}</td>
                  <td className="p-3">{s.total_cards}</td>
                  <td className="p-3">{s.total_saves}</td>
                  <td className="p-3 space-x-2">
                    <Button as={Link} to={`/flashcard-sets/${s.id}`}>Xem</Button>
                    <Button as={Link} to={`/flashcard-sets/${s.id}?edit=1`}>Chỉnh sửa</Button>
                    <Button variant="danger" onClick={() => onDelete(s.id)}>Xóa</Button>
                  </td>
                </tr>
              ))}
              {sets.length === 0 && (
                <tr><td className="p-4 text-center text-gray-500" colSpan={8}>Không có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default AdminFlashcardSetsPage;


