import { apiClient } from './api.js';

export const studyPlanService = {
  getAll: async (status = null) => {
    const query = status ? `?status=${status}` : '';
    const res = await apiClient(`/study-plans${query}`);
    return res.data || [];
  },

  getById: async (id) => {
    const res = await apiClient(`/study-plans/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await apiClient('/study-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient(`/study-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  toggleTask: async (planId, taskId) => {
    const res = await apiClient(`/study-plans/${planId}/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    });
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient(`/study-plans/${id}`, {
      method: 'DELETE',
    });
    return res;
  },
};
