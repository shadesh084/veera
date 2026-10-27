import { apiClient } from './api.js';

export const aiAdvisorService = {
  getStatus: async () => {
    const res = await apiClient('/ai-advisor/status');
    return res.data;
  },

  analyze: async (payload = {}) => {
    const res = await apiClient('/ai-advisor/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },

  generateStudyPlan: async (payload = {}) => {
    const res = await apiClient('/ai-advisor/study-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },
};
