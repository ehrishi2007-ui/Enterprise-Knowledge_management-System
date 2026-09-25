export const ROLES = ['admin', 'lecturer', 'student', 'employee', 'staff'];

export const ROLE_CONFIG = {
  admin: {
    label: 'Administrator',
    color: 'olive',
    badgeClass: 'bg-[#3d3c2a]/15 text-[#3d3c2a] dark:text-[#e0d8cd] border-[#3d3c2a]/30 dark:border-[#e0d8cd]/30'
  },
  lecturer: {
    label: 'Lecturer / Faculty',
    color: 'stone',
    badgeClass: 'bg-[#524f38]/15 text-[#524f38] dark:text-[#ded8cb] border-[#524f38]/30 dark:border-[#ded8cb]/30'
  },
  student: {
    label: 'Student',
    color: 'olive',
    badgeClass: 'bg-[#6b6548]/15 text-[#6b6548] dark:text-[#eae4d9] border-[#6b6548]/30 dark:border-[#eae4d9]/30'
  },
  employee: {
    label: 'Staff / Employee',
    color: 'stone',
    badgeClass: 'bg-[#3d3c2a]/15 text-[#3d3c2a] dark:text-[#e0d8cd] border-[#3d3c2a]/30 dark:border-[#e0d8cd]/30'
  },
  staff: {
    label: 'Support Staff',
    color: 'olive',
    badgeClass: 'bg-[#524f38]/15 text-[#524f38] dark:text-[#ded8cb] border-[#524f38]/30 dark:border-[#ded8cb]/30'
  },
};

// Organic, architectural department colors matching the Dark Olive Gray & Warm Stone aesthetic
export const DEFAULT_DEPT_COLORS = {
  Engineering: '#5b6752',
  HR: '#a47852',
  Finance: '#4c6457',
  Legal: '#705d54',
  Operations: '#7a7050',
  'Computer Science': '#4f5f5f',
  Mathematics: '#997a52',
  Physics: '#5d6c60',
  Administration: '#75645c',
  Library: '#6b6851',
};

export const CONTENT_TYPES = [
  { value: 'text_only', label: 'Text Only', description: 'Standard digital PDF with selectable text' },
  { value: 'images_only', label: 'Scanned (OCR)', description: 'Scanned pages — uses AI Vision to extract text' },
  { value: 'combination', label: 'Combination', description: 'Text + embedded charts/diagrams' },
];
