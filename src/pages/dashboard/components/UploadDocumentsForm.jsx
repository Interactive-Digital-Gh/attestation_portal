import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ImageUp, Trash2, Loader } from 'lucide-react';
import SupremeCourtSeal from '../../../assets/images/supreme_court_seal.png';
import PdfIcon from '../../../assets/images/pdf_icon.svg';
import { FieldLabel, SectionLabel, PrimaryButton, InfoBanner, Badge, StepFooter } from './ui';
import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
  OFFICER_VERIFICATION_DAYS,
  formatFileSize,
  requiresOfficerVerification,
} from '../documentTypes';

const MAX_DOCS = 5;
const MAX_BYTES = 10 * 1024 * 1024;
/** Simulated client-side check; the seal check proper runs after submission. */
const CHECK_DELAY_MS = 1400;

const readyStatus = (doc) => (requiresOfficerVerification(doc) ? DOCUMENT_STATUS.QUEUED : DOCUMENT_STATUS.ACCEPTED);

const DocumentCard = ({ doc, onRemove }) => (
  <div className="bg-white border border-neutral-100 rounded-[10px] shadow-[0_1px_5.25px_rgba(0,0,0,0.03)] pt-[10px] pb-[17px] px-4 sm:px-[27px] flex items-center justify-between gap-4">
    <div className="flex flex-col items-start min-w-0">
      <div className="flex items-center gap-[5px] min-w-0">
        <div className="size-[55px] flex items-center justify-center shrink-0">
          <img src={PdfIcon} alt="" className="size-8" />
        </div>
        <div className="flex flex-col gap-[5px] min-w-0 text-[11px]">
          <span className="font-semibold text-neutral-500 truncate">{doc.type}</span>
          <span className="flex items-center gap-3 text-neutral-450 min-w-0">
            <span className="truncate">{doc.name}</span>
            <span className="shrink-0">{doc.sizeLabel}</span>
          </span>
        </div>
      </div>
      {doc.status === DOCUMENT_STATUS.CHECKING ? (
        <div className="flex items-center gap-1.5 pl-[62px] text-sm font-medium text-brand-navy-500">
          <Loader className="size-6 animate-spin" strokeWidth={1.5} />
          checking...
        </div>
      ) : (
        <Badge variant={doc.status === DOCUMENT_STATUS.ACCEPTED ? 'accepted' : 'queued'}>{doc.status}</Badge>
      )}
    </div>
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${doc.name}`}
      className="text-neutral-400 hover:text-brand-red-500 transition-colors shrink-0"
    >
      <Trash2 className="size-6" strokeWidth={1.5} />
    </button>
  </div>
);

/**
 * Step 2 — Upload documents.
 * Pick a document type, drop a scan, and the file is listed under
 * "Checked on upload" or "Officer verification queue" depending on its type.
 */
const UploadDocumentsForm = ({ initialData = [], onSave, onProgressUpdate }) => {
  const [selectedType, setSelectedType] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [docs, setDocs] = useState(() =>
    initialData.map((d) => ({ ...d, status: d.status === DOCUMENT_STATUS.CHECKING ? readyStatus(d) : d.status }))
  );
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const dropdownRef = useRef(null);
  const timers = useRef({});

  // Close the type dropdown on outside click / Escape.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  // Clear any pending "checking" timers on unmount.
  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const checking = docs.some((d) => d.status === DOCUMENT_STATUS.CHECKING);
  const progress = docs.length === 0 ? 0 : checking ? 50 : 100;

  useEffect(() => {
    onProgressUpdate?.(progress);
  }, [progress, onProgressUpdate]);

  const addFile = (file) => {
    if (!file) return;
    if (!selectedType) {
      setError('Choose a document type before uploading.');
      return;
    }
    if (docs.length >= MAX_DOCS) {
      setError(`You can attach up to ${MAX_DOCS} documents per submission.`);
      return;
    }
    if (!/^image\//.test(file.type) && file.type !== 'application/pdf') {
      setError('Upload a PDF, JPG or PNG file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File is larger than 10MB.');
      return;
    }
    setError('');

    const def = DOCUMENT_TYPES.find((t) => t.value === selectedType);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const doc = {
      id,
      type: selectedType,
      verification: def?.verification || 'upload',
      name: file.name,
      size: file.size,
      sizeLabel: formatFileSize(file.size),
      file,
      status: DOCUMENT_STATUS.CHECKING,
    };
    setDocs((prev) => [...prev, doc]);
    timers.current[id] = setTimeout(() => {
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, status: readyStatus(d) } : d)));
      delete timers.current[id];
    }, CHECK_DELAY_MS);
  };

  const removeDoc = (id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const uploadChecked = docs.filter((d) => !requiresOfficerVerification(d));
  const officerQueue = docs.filter(requiresOfficerVerification);
  const canContinue = docs.length > 0 && !checking;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,523px)_minmax(0,1fr)] gap-8 lg:gap-[33px]">
        {/* Left column */}
        <div className="flex flex-col gap-[22px]">
          <div className="flex items-center gap-4 sm:gap-[21px]">
            <img
              src={SupremeCourtSeal}
              alt="Example of the Supreme Court seal"
              className="w-[112px] h-[115px] object-contain shrink-0"
            />
            <div className="flex flex-col gap-3 max-w-[395px]">
              <p className="text-xs font-bold text-neutral-500">Confirm the Supreme Court seal is present</p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                The Supreme Court or Judicial Service Registry stamp must be clearly visible before you upload.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-[9px]" ref={dropdownRef}>
            <FieldLabel>Document type</FieldLabel>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className="w-full h-11 rounded-md border border-neutral-200 bg-white pl-4 pr-[15px] flex items-center justify-between text-sm hover:border-neutral-300 focus:border-brand-navy-400 outline-none transition-colors"
              >
                <span className={selectedType ? 'text-neutral-600' : 'text-neutral-300'}>
                  {selectedType || 'Select document type'}
                </span>
                <ChevronDown
                  className={`size-6 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  strokeWidth={1.5}
                />
              </button>
              {isOpen && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+9px)] z-20 bg-white border border-neutral-200 rounded-lg shadow-[0_1px_3px_rgba(10,22,40,0.06),0_4px_12px_rgba(10,22,40,0.12)] py-1 overflow-hidden"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <li key={t.value} role="option" aria-selected={selectedType === t.value}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedType(t.value);
                          setIsOpen(false);
                          setError('');
                        }}
                        className={`w-full h-11 px-4 text-left text-sm text-neutral-600 transition-colors hover:bg-neutral-50 hover:font-semibold ${
                          selectedType === t.value ? 'bg-neutral-50 font-semibold' : ''
                        }`}
                      >
                        {t.value}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,image/*"
              className="hidden"
              onChange={(e) => {
                addFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload document scan"
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                addFile(e.dataTransfer.files?.[0]);
              }}
              className={`h-[129px] rounded-lg border-[1.5px] border-dashed border-brand-gold-500 flex flex-col items-center justify-center gap-[3px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-600/40 ${
                isDragging ? 'bg-brand-gold-50' : 'bg-brand-gold-50/16 hover:bg-brand-gold-50/40'
              }`}
            >
              <ImageUp className="size-6 text-brand-gold-700" strokeWidth={1.5} />
              <span className="text-xs font-medium text-neutral-450">Click to upload or drag &amp; drop</span>
              <span className="text-[10px] text-neutral-450">PDF, JPG or PNG&nbsp;&nbsp;Max 10MB</span>
            </div>
            {error && <p className="mt-2 text-[11px] text-brand-red-500">{error}</p>}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-[14px]">
          {docs.length === 0 ? (
            <div className="rounded-lg border-[1.5px] border-dashed border-neutral-200 bg-white pt-[38px] pb-[34px] px-6 text-center text-xs text-neutral-300">
              No documents yet. Choose a type and upload a scan to begin.
            </div>
          ) : (
            <>
              {uploadChecked.length > 0 && (
                <>
                  <SectionLabel>Checked on upload</SectionLabel>
                  {uploadChecked.map((d) => (
                    <DocumentCard key={d.id} doc={d} onRemove={() => removeDoc(d.id)} />
                  ))}
                </>
              )}
              {officerQueue.length > 0 && (
                <>
                  <SectionLabel>Officer verification queue</SectionLabel>
                  <InfoBanner center className="py-[10px]">
                    These documents are confirmed with the institutions that issued them.
                    <br />
                    Allow at least {OFFICER_VERIFICATION_DAYS} working days. Your earliest appointment date reflects this.
                  </InfoBanner>
                  {officerQueue.map((d) => (
                    <DocumentCard key={d.id} doc={d} onRemove={() => removeDoc(d.id)} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <StepFooter className="mt-8 md:mt-[50px]">
        <PrimaryButton disabled={!canContinue} onClick={() => onSave(docs)}>
          Continue to payments
        </PrimaryButton>
      </StepFooter>
    </div>
  );
};

export default UploadDocumentsForm;
