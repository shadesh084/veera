import { apiClient } from './api.js';

export const analyticsService = {
  getDashboard: async () => {
    const res = await apiClient('/analytics/dashboard');
    return res.data;
  },

  getProgress: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.subject_id) query.append('subject_id', params.subject_id);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient(`/analytics/progress${queryString}`);
    return res.data;
  },
};
