import { apiClient } from './api.js';

export const reportService = {
  getSummary: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient(`/reports/summary${queryString}`);
    return res.data;
  },

  downloadCsv: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const blob = await apiClient(`/reports/export-csv${queryString}`);

    // Trigger browser file download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `academic-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
