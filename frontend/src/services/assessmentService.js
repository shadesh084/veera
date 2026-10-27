import { apiClient } from './api.js';

export const assessmentService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.subject_id) query.append('subject_id', params.subject_id);
    if (params.assessment_type) query.append('assessment_type', params.assessment_type);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.search) query.append('search', params.search);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient(`/assessments${queryString}`);
    return res.data || [];
  },

  getById: async (id) => {
    const res = await apiClient(`/assessments/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await apiClient('/assessments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient(`/assessments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient(`/assessments/${id}`, {
      method: 'DELETE',
    });
    return res;
  },
};
