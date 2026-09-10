/**
 * Shared constants and helpers for the applicant "new application" flow.
 *
 * Document types come from the Figma "Step 2" document-type dropdown. Each type
 * is either checked automatically on upload or queued for officer verification
 * with the issuing institution, which pushes the earliest appointment date out.
 */

export const OFFICER_VERIFICATION_DAYS = 5;

export const DOCUMENT_TYPES = [
  { value: 'Birth certificate',            verification: 'upload' },
  { value: 'Marriage certificate',         verification: 'upload' },
  { value: 'Police report',                verification: 'officer', issuer: 'the Ghana Police Service' },
  { value: 'Certificate of incorporation', verification: 'officer', issuer: 'the Registrar of Companies' },
  { value: 'University transcript',        verification: 'officer', issuer: 'the issuing university' },
  { value: 'WASSCE or BECE certificate',   verification: 'officer', issuer: 'WAEC' },
];

export const DOCUMENT_STATUS = {
  CHECKING: 'checking',
  ACCEPTED: 'Accepted',
  QUEUED: 'Queued for officer review',
};

export const getDocumentType = (value) => DOCUMENT_TYPES.find((t) => t.value === value);

export const requiresOfficerVerification = (doc) =>
  (doc?.verification || getDocumentType(doc?.type)?.verification) === 'officer';

/** Adds `days` working days (Mon–Fri) to `start` and returns a new Date at local midnight. */
export const addWorkingDays = (start, days) => {
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return d;
};

/** Earliest appointment date implied by the uploaded documents, or null when unrestricted. */
export const getEarliestAppointmentDate = (documents = []) =>
  documents.some(requiresOfficerVerification)
    ? addWorkingDays(new Date(), OFFICER_VERIFICATION_DAYS)
    : null;

/** Unique officer-verified document types and their issuers (for the notice banners). */
export const getOfficerVerificationSummary = (documents = []) => {
  const types = [];
  const issuers = [];
  documents.filter(requiresOfficerVerification).forEach((doc) => {
    const def = getDocumentType(doc.type);
    if (!types.includes(doc.type)) types.push(doc.type);
    if (def?.issuer && !issuers.includes(def.issuer)) issuers.push(def.issuer);
  });
  return { types, issuers };
};

/** "Wed Aug 26 2026" */
export const formatLongDate = (date) => (date ? new Date(date).toDateString() : '');

/** Local yyyy-mm-dd (avoids the UTC shift of toISOString). */
export const toISODate = (date) => {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Parses a local yyyy-mm-dd string into a Date at local midnight. */
export const fromISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** "GHS 1,000" */
export const formatGHS = (amount) => `GHS ${Number(amount || 0).toLocaleString('en-GH')}`;

/** "9:00 AM" -> { hour: "9:00", period: "am" } */
export const splitSlotTime = (time = '') => {
  const match = time.trim().match(/^(\d{1,2}:\d{2})\s*(am|pm)?$/i);
  if (!match) return { hour: time, period: '' };
  return { hour: match[1], period: (match[2] || '').toLowerCase() };
};

/** "9:00 AM" -> minutes since midnight, for sorting. */
export const slotTimeToMinutes = (time = '') => {
  const { hour, period } = splitSlotTime(time);
  const [h, m] = hour.split(':').map(Number);
  if (Number.isNaN(h)) return 0;
  let hours = h % 12;
  if (period === 'pm') hours += 12;
  if (!period) hours = h;
  return hours * 60 + (m || 0);
};

/** "2:00 PM" -> "14:00" */
export const formatSlotTime24 = (time = '') => {
  const minutes = slotTimeToMinutes(time);
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
};

/** Human file size, e.g. "2.2 MB" */
export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2).replace(/\.?0+$/, '')} MB`;
};

/** Short summary of document types for the applications table ("Marriage cert." style). */
export const summarizeDocumentTypes = (documents = []) => {
  const types = [...new Set(documents.map((d) => d.type).filter(Boolean))];
  if (types.length === 0) return 'Document';
  if (types.length === 1) return types[0];
  return `${types[0]} +${types.length - 1} more`;
};
