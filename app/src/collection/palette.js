// Pure color data shared by tokens.js and Node-tested modules (no RN imports).
// Verified by design-system/threads-collection/contrast_check.py.
// 雜誌 direction: low-chroma, ink-friendly hues that sit quietly next to photos.
// Tag hues: parent tags pick one, child tags inherit it. slate is reserved for 未分類.
export const TAG_COLORS = {
  rose: { lightBg: '#F3E1E1', lightText: '#943040', darkText: '#EDA3AC', dot: '#C4485C' },
  orange: { lightBg: '#F3E4D6', lightText: '#8A4215', darkText: '#EBB083', dot: '#C9692B' },
  green: { lightBg: '#E2EADB', lightText: '#3F5E2A', darkText: '#B0CC92', dot: '#6B8E47' },
  teal: { lightBg: '#DCEAE6', lightText: '#285E57', darkText: '#8DCBBE', dot: '#3F8C80' },
  sky: { lightBg: '#DEE6EF', lightText: '#2A5780', darkText: '#9BBFE2', dot: '#4C82B4' },
  indigo: { lightBg: '#E1E2EF', lightText: '#3A4589', darkText: '#AEB5E8', dot: '#5864B4' },
  violet: { lightBg: '#E8E0EE', lightText: '#5E3D82', darkText: '#C8B1E3', dot: '#8763AF' },
  pink: { lightBg: '#F2E0E8', lightText: '#8A3157', darkText: '#EBA7C5', dot: '#B9527F' },
  slate: { lightBg: '#E6E4DF', lightText: '#4F4C46', darkText: '#C6C2BA', dot: '#827D74' },
};

export const TAG_HUES = Object.keys(TAG_COLORS);
