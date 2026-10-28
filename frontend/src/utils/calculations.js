/**
 * Shared academic calculation engine (frontend mirror of backend utils)
 */

export const PERFORMANCE_BANDS = {
  EXCELLENT: { min: 90.0, max: 100.0, label: 'Excellent', color: 'emerald', grade: 'A+' },
  GOOD: { min: 75.0, max: 89.99, label: 'Good', color: 'blue', grade: 'A' },
  SATISFACTORY: { min: 60.0, max: 74.99, label: 'Satisfactory', color: 'amber', grade: 'B' },
  NEEDS_IMPROVEMENT: { min: 40.0, max: 59.99, label: 'Needs Improvement', color: 'orange', grade: 'C' },
  CRITICAL_REVIEW: { min: 0.0, max: 39.99, label: 'Critical Review', color: 'rose', grade: 'D/F' },
};

export const getPerformanceBand = (percentage) => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) return null;
  const pct = Number(percentage);
  if (pct >= 90.0) return PERFORMANCE_BANDS.EXCELLENT;
  if (pct >= 75.0) return PERFORMANCE_BANDS.GOOD;
  if (pct >= 60.0) return PERFORMANCE_BANDS.SATISFACTORY;
  if (pct >= 40.0) return PERFORMANCE_BANDS.NEEDS_IMPROVEMENT;
  return PERFORMANCE_BANDS.CRITICAL_REVIEW;
};

export const calculateAssessmentPercentage = (marksObtained, maxMarks) => {
  const marks = parseFloat(marksObtained);
  const max = parseFloat(maxMarks);
  if (isNaN(marks) || isNaN(max) || max <= 0 || marks < 0) return null;
  return Math.round((marks / max) * 10000) / 100;
};

export const calculateOverallWeightedPercentage = (assessments = []) => {
  if (!Array.isArray(assessments) || assessments.length === 0) return null;
  let totalMarks = 0;
  let totalMax = 0;
  for (const item of assessments) {
    const marks = parseFloat(item.marks_obtained);
    const max = parseFloat(item.max_marks);
    if (!isNaN(marks) && !isNaN(max) && max > 0 && marks >= 0) {
      totalMarks += marks;
      totalMax += max;
    }
  }
  if (totalMax <= 0) return null;
  return Math.round((totalMarks / totalMax) * 10000) / 100;
};

export const calculateSubjectMetrics = (subjects = [], assessments = []) => {
  const subjectMap = new Map();
  for (const subject of subjects) {
    subjectMap.set(subject.id, {
      id: subject.id,
      name: subject.name,
      subject_code: subject.subject_code || null,
      color: subject.color || 'blue',
      target_percentage: subject.target_percentage !== null ? parseFloat(subject.target_percentage) : null,
      assessments_count: 0,
      total_marks_obtained: 0,
      total_max_marks: 0,
      weighted_percentage: null,
      performance_band: null,
      target_achieved: null,
      target_gap: null,
      assessments: [],
    });
  }

  for (const item of assessments) {
    const subjectData = subjectMap.get(item.subject_id);
    if (subjectData) {
      const marks = parseFloat(item.marks_obtained);
      const max = parseFloat(item.max_marks);
      if (!isNaN(marks) && !isNaN(max) && max > 0 && marks >= 0) {
        subjectData.assessments_count += 1;
        subjectData.total_marks_obtained += marks;
        subjectData.total_max_marks += max;
        subjectData.assessments.push({ ...item, percentage: calculateAssessmentPercentage(marks, max) });
      }
    }
  }

  const results = [];
  for (const subject of subjectMap.values()) {
    if (subject.total_max_marks > 0) {
      subject.weighted_percentage = Math.round((subject.total_marks_obtained / subject.total_max_marks) * 10000) / 100;
      subject.performance_band = getPerformanceBand(subject.weighted_percentage);
      if (subject.target_percentage !== null) {
        subject.target_achieved = subject.weighted_percentage >= subject.target_percentage;
        subject.target_gap = Math.round((subject.weighted_percentage - subject.target_percentage) * 100) / 100;
      }
    }
    results.push(subject);
  }
  return results;
};

export const calculateTrendAnalysis = (assessments = []) => {
  if (!Array.isArray(assessments) || assessments.length < 2) {
    return {
      status: 'insufficient_data',
      message: assessments.length === 0
        ? 'No assessments recorded yet.'
        : 'At least two assessments are required to calculate a historical trend.',
      delta: null,
      recent_average: null,
      previous_average: null,
    };
  }
  const sorted = [...assessments].sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date));
  const midpoint = Math.floor(sorted.length / 2);
  const previousPct = calculateOverallWeightedPercentage(sorted.slice(0, midpoint));
  const recentPct = calculateOverallWeightedPercentage(sorted.slice(midpoint));
  if (previousPct === null || recentPct === null) {
    return { status: 'insufficient_data', message: 'Unable to calculate percentages from recorded marks.', delta: null, recent_average: recentPct, previous_average: previousPct };
  }
  const delta = Math.round((recentPct - previousPct) * 100) / 100;
  let status = 'stable';
  let message = 'Performance has remained steady across assessment periods.';
  if (delta >= 2.0) { status = 'improving'; message = `Performance improved by ${delta}% compared to earlier assessments.`; }
  else if (delta <= -2.0) { status = 'declining'; message = `Performance dropped by ${Math.abs(delta)}% compared to earlier assessments. Extra revision is advised.`; }
  return { status, message, delta, recent_average: recentPct, previous_average: previousPct };
};

export const computeAcademicOverview = (subjects = [], assessments = [], profile = null) => {
  const overallWeightedPercentage = calculateOverallWeightedPercentage(assessments);
  const subjectMetrics = calculateSubjectMetrics(subjects, assessments);
  const subjectsWithScores = subjectMetrics.filter((s) => s.weighted_percentage !== null);

  let averageSubjectPercentage = null;
  if (subjectsWithScores.length > 0) {
    averageSubjectPercentage = Math.round((subjectsWithScores.reduce((acc, s) => acc + s.weighted_percentage, 0) / subjectsWithScores.length) * 100) / 100;
  }

  let bestSubject = null;
  let lowestSubject = null;
  if (subjectsWithScores.length > 0) {
    const sorted = [...subjectsWithScores].sort((a, b) => b.weighted_percentage - a.weighted_percentage);
    bestSubject = { id: sorted[0].id, name: sorted[0].name, percentage: sorted[0].weighted_percentage, color: sorted[0].color };
    lowestSubject = { id: sorted[sorted.length - 1].id, name: sorted[sorted.length - 1].name, percentage: sorted[sorted.length - 1].weighted_percentage, color: sorted[sorted.length - 1].color };
  }

  const profileTarget = profile?.target_percentage ? parseFloat(profile.target_percentage) : null;
  let profileTargetAchieved = null;
  let profileTargetGap = null;
  if (profileTarget !== null && overallWeightedPercentage !== null) {
    profileTargetAchieved = overallWeightedPercentage >= profileTarget;
    profileTargetGap = Math.round((overallWeightedPercentage - profileTarget) * 100) / 100;
  }

  return {
    total_subjects: subjects.length,
    total_assessments: assessments.length,
    overall_percentage: overallWeightedPercentage,
    calculation_method: 'marks_weighted_ratio',
    performance_band: getPerformanceBand(overallWeightedPercentage),
    average_subject_percentage: averageSubjectPercentage,
    best_performing_subject: bestSubject,
    lowest_performing_subject: lowestSubject,
    profile_target: profileTarget,
    target_achieved: profileTargetAchieved,
    target_gap: profileTargetGap,
    trend: calculateTrendAnalysis(assessments),
    subjects: subjectMetrics,
  };
};
