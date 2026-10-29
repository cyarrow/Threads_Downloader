// Pure color data shared by tokens.js and Node-tested modules (no RN imports).
// Verified by design-system/threads-collection/contrast_check.py.
// Tag hues: parent tags pick one, child tags inherit it. slate is reserved for 未分類.
export const TAG_COLORS = {
  rose: { lightBg: '#FFE4E6', lightText: '#9F1239', darkText: '#FDA4AF', dot: '#F43F5E' },
  orange: { lightBg: '#FFEDD5', lightText: '#9A3412', darkText: '#FDBA74', dot: '#F97316' },
  green: { lightBg: '#DCFCE7', lightText: '#166534', darkText: '#86EFAC', dot: '#22C55E' },
  teal: { lightBg: '#CCFBF1', lightText: '#115E59', darkText: '#5EEAD4', dot: '#14B8A6' },
  sky: { lightBg: '#E0F2FE', lightText: '#075985', darkText: '#7DD3FC', dot: '#0EA5E9' },
  indigo: { lightBg: '#E0E7FF', lightText: '#3730A3', darkText: '#A5B4FC', dot: '#6366F1' },
  violet: { lightBg: '#F3E8FF', lightText: '#6B21A8', darkText: '#D8B4FE', dot: '#A855F7' },
  pink: { lightBg: '#FCE7F3', lightText: '#9D174D', darkText: '#F9A8D4', dot: '#EC4899' },
  slate: { lightBg: '#F1F5F9', lightText: '#334155', darkText: '#CBD5E1', dot: '#64748B' },
};

export const TAG_HUES = Object.keys(TAG_COLORS);
