/**
 * Date and time helper utilities for Indonesian Attendance Application
 */

export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentTimeString = (): string => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

/**
 * Checks if current time is past entry time limit
 * @param currentTimeStr "HH:mm:ss" or "HH:mm"
 * @param limitTimeStr "HH:mm" e.g. "07:00"
 * @param toleranceMinutes e.g. 5
 */
export const calculateLateMinutes = (
  currentTimeStr: string,
  limitTimeStr: string,
  toleranceMinutes: number = 0
): { isLate: boolean; lateMinutes: number } => {
  const parseMinutes = (time: string) => {
    const parts = time.split(':').map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  };

  const currentMin = parseMinutes(currentTimeStr);
  const limitMin = parseMinutes(limitTimeStr) + toleranceMinutes;

  if (currentMin > limitMin) {
    return {
      isLate: true,
      lateMinutes: currentMin - parseMinutes(limitTimeStr)
    };
  }

  return {
    isLate: false,
    lateMinutes: 0
  };
};

export const generateSampleDates = (daysCount: number = 7): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
};

/**
 * Returns Academic Year string based on Academic Calendar (e.g. "2026/2027")
 * Academic year starts in July (month index 6) and ends in June (month index 5).
 */
export const getAcademicYearFromDate = (dateInput?: Date | string): string => {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput);
    if (isNaN(date.getTime())) date = new Date();
  } else {
    date = dateInput;
  }

  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 6 = July
  if (month >= 6) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};

/**
 * Returns Semester string based on Academic Calendar ("Ganjil" or "Genap")
 */
export const getSemesterFromDate = (dateInput?: Date | string): string => {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput);
    if (isNaN(date.getTime())) date = new Date();
  } else {
    date = dateInput;
  }

  const month = date.getMonth();
  return month >= 6 ? 'Ganjil' : 'Genap';
};

