import { describe, it, expect } from 'vitest';
import {
  calculateAssessmentPercentage,
  calculateOverallWeightedPercentage,
  calculateSubjectMetrics,
  calculateTrendAnalysis,
  getPerformanceBand,
  PERFORMANCE_BANDS,
} from '../src/utils/calculations.js';

describe('Academic Calculation Engine', () => {
  describe('calculateAssessmentPercentage', () => {
    it('calculates correct percentage for standard marks', () => {
      expect(calculateAssessmentPercentage(18, 20)).toBe(90.0);
      expect(calculateAssessmentPercentage(45, 50)).toBe(90.0);
      expect(calculateAssessmentPercentage(33.5, 50)).toBe(67.0);
    });

    it('handles decimal precision and rounding to 2 decimal places', () => {
      expect(calculateAssessmentPercentage(2, 3)).toBe(66.67);
      expect(calculateAssessmentPercentage(1, 7)).toBe(14.29);
    });

    it('handles 0 marks obtained correctly', () => {
      expect(calculateAssessmentPercentage(0, 50)).toBe(0.0);
    });

    it('returns null and protects against division by zero', () => {
      expect(calculateAssessmentPercentage(10, 0)).toBeNull();
      expect(calculateAssessmentPercentage(10, -5)).toBeNull();
    });

    it('returns null on invalid or negative marks', () => {
      expect(calculateAssessmentPercentage(-5, 20)).toBeNull();
      expect(calculateAssessmentPercentage('abc', 20)).toBeNull();
    });
  });

  describe('calculateOverallWeightedPercentage', () => {
    it('calculates weighted percentage using sum(marks) / sum(max) * 100', () => {
      // Assessment 1: 10/10 (100%), Assessment 2: 50/100 (50%)
      // Unweighted average would be 75%.
      // Weighted percentage MUST be 60/110 * 100 = 54.55%
      const assessments = [
        { marks_obtained: 10, max_marks: 10 },
        { marks_obtained: 50, max_marks: 100 },
      ];
      expect(calculateOverallWeightedPercentage(assessments)).toBe(54.55);
    });

    it('returns null when assessment list is empty', () => {
      expect(calculateOverallWeightedPercentage([])).toBeNull();
      expect(calculateOverallWeightedPercentage(null)).toBeNull();
    });

    it('correctly aggregates multiple subjects', () => {
      const assessments = [
        { marks_obtained: 40, max_marks: 50 }, // 80%
        { marks_obtained: 20, max_marks: 25 }, // 80%
        { marks_obtained: 25, max_marks: 25 }, // 100%
      ];
      // total = 85 / 100 = 85.0%
      expect(calculateOverallWeightedPercentage(assessments)).toBe(85.0);
    });
  });

  describe('calculateSubjectMetrics', () => {
    it('computes metrics per subject and handles subjects with no assessments', () => {
      const subjects = [
        { id: 's1', name: 'Math', color: 'blue', target_percentage: 80 },
        { id: 's2', name: 'History', color: 'amber', target_percentage: 75 },
      ];
      const assessments = [
        { subject_id: 's1', marks_obtained: 45, max_marks: 50 },
        { subject_id: 's1', marks_obtained: 40, max_marks: 50 },
      ];

      const metrics = calculateSubjectMetrics(subjects, assessments);
      expect(metrics).toHaveLength(2);

      const math = metrics.find((m) => m.id === 's1');
      expect(math.assessments_count).toBe(2);
      expect(math.weighted_percentage).toBe(85.0);
      expect(math.target_achieved).toBe(true);

      const history = metrics.find((m) => m.id === 's2');
      expect(history.assessments_count).toBe(0);
      expect(history.weighted_percentage).toBeNull();
      expect(history.target_achieved).toBeNull();
    });
  });

  describe('calculateTrendAnalysis', () => {
    it('returns insufficient_data when fewer than 2 assessments exist', () => {
      expect(calculateTrendAnalysis([]).status).toBe('insufficient_data');
      expect(calculateTrendAnalysis([{ assessment_date: '2026-01-01', marks_obtained: 10, max_marks: 10 }]).status).toBe('insufficient_data');
    });

    it('detects improving trend', () => {
      const assessments = [
        { assessment_date: '2026-09-01', marks_obtained: 30, max_marks: 50 }, // 60%
        { assessment_date: '2026-09-10', marks_obtained: 35, max_marks: 50 }, // 70%
        { assessment_date: '2026-10-01', marks_obtained: 45, max_marks: 50 }, // 90%
        { assessment_date: '2026-10-15', marks_obtained: 48, max_marks: 50 }, // 96%
      ];
      const trend = calculateTrendAnalysis(assessments);
      expect(trend.status).toBe('improving');
      expect(trend.delta).toBeGreaterThan(0);
    });

    it('detects declining trend', () => {
      const assessments = [
        { assessment_date: '2026-09-01', marks_obtained: 45, max_marks: 50 }, // 90%
        { assessment_date: '2026-10-01', marks_obtained: 25, max_marks: 50 }, // 50%
      ];
      const trend = calculateTrendAnalysis(assessments);
      expect(trend.status).toBe('declining');
      expect(trend.delta).toBe(-40.0);
    });
  });

  describe('getPerformanceBand', () => {
    it('assigns correct bands based on boundaries', () => {
      expect(getPerformanceBand(95).label).toBe(PERFORMANCE_BANDS.EXCELLENT.label);
      expect(getPerformanceBand(90).label).toBe(PERFORMANCE_BANDS.EXCELLENT.label);
      expect(getPerformanceBand(89.9).label).toBe(PERFORMANCE_BANDS.GOOD.label);
      expect(getPerformanceBand(75).label).toBe(PERFORMANCE_BANDS.GOOD.label);
      expect(getPerformanceBand(65).label).toBe(PERFORMANCE_BANDS.SATISFACTORY.label);
      expect(getPerformanceBand(55).label).toBe(PERFORMANCE_BANDS.NEEDS_IMPROVEMENT.label);
      expect(getPerformanceBand(35).label).toBe(PERFORMANCE_BANDS.CRITICAL_REVIEW.label);
      expect(getPerformanceBand(null)).toBeNull();
    });
  });
});
