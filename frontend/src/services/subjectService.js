import { apiClient } from './api.js';

export const subjectService = {
  getAll: async () => {
    const res = await apiClient('/subjects');
    return res.data || [];
  },

  getById: async (id) => {
    const res = await apiClient(`/subjects/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await apiClient('/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient(`/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient(`/subjects/${id}`, {
      method: 'DELETE',
    });
    return res;
  },
};
