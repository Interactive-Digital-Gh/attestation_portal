import { useState, useRef, useEffect, useMemo } from 'react';
import { CalendarDays, ImageUp, Trash2 } from 'lucide-react';
import { FieldLabel, TextInput, PrimaryButton, PhonePrefix, StepFooter } from './ui';
import { formatFileSize, toISODate } from '../documentTypes';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const GHANA_CARD_RE = /^GHA-\d{9}-\d$/;

/** "+233548902177" -> "548902177" */
const localDigits = (phone = '') => (phone || '').replace(/\D/g, '').replace(/^233/, '').replace(/^0/, '');

/**
 * Step 1 — Complete profile.
 * For "Myself" applications the name and phone come from the account profile
 * and are shown read-only; for "Someone else" they describe the beneficiary.
 */
const PersonalDetailsForm = ({ initialData, onSave, onProgressUpdate, applicantType = 'self', profile, user }) => {
  const isSelf = applicantType === 'self';
  const profileName = profile?.full_name || user?.user_metadata?.full_name || '';
  const profilePhone = profile?.phone_number || user?.phone || user?.user_metadata?.phone || '';

  const [form, setForm] = useState(() => ({
    fullName: initialData?.fullName ?? (isSelf ? profileName : ''),
    phoneLocal: initialData?.phoneLocal ?? localDigits(isSelf ? profilePhone : ''),
    dob: initialData?.dob ?? '',
    ghanaCardNumber: initialData?.ghanaCardNumber ?? '',
    ghanaCardPhoto: initialData?.ghanaCardPhoto ?? null,
  }));
  const [photoError, setPhotoError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dateRef = useRef(null);
  const fileRef = useRef(null);

  const nameLocked = isSelf && !!profileName;
  const phoneLocked = isSelf && !!localDigits(profilePhone);

  const cardValid = GHANA_CARD_RE.test(form.ghanaCardNumber);
  const cardTouched = form.ghanaCardNumber.length > 0;

  const progress = useMemo(() => {
    const checks = [
      form.fullName.trim().length > 1,
      form.phoneLocal.length >= 9,
      !!form.dob,
      cardValid,
      !!form.ghanaCardPhoto,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, cardValid]);

  useEffect(() => {
    onProgressUpdate?.(progress);
  }, [progress, onProgressUpdate]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const acceptFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type) && file.type !== 'application/pdf') {
      setPhotoError('Upload a PDF, JPG or PNG file.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('File is larger than 10MB.');
      return;
    }
    setPhotoError('');
    update('ghanaCardPhoto', { file, name: file.name, size: file.size, sizeLabel: formatFileSize(file.size) });
  };

  const handleSave = () =>
    onSave({
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneLocal ? `+233${form.phoneLocal}` : '',
      phoneLocal: form.phoneLocal,
      dob: form.dob,
      ghanaCardNumber: form.ghanaCardNumber.toUpperCase(),
      ghanaCardPhoto: form.ghanaCardPhoto,
    });

  const dobDisplay = form.dob ? form.dob.split('-').reverse().join(' / ') : 'DD / MM / YYYY';
  const today = toISODate(new Date());

  return (
    <div>
      {!isSelf && (
        <p className="text-xs text-neutral-500 mb-4 -mt-1">
          Enter the details of the person the documents belong to. Their Ghana Card is checked at the appointment.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[19px] gap-y-[22px]">
        {/* Left column */}
        <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-[9px]">
            <FieldLabel htmlFor="pd-fullName">Full name</FieldLabel>
            <TextInput
              id="pd-fullName"
              readOnly={nameLocked}
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="Ama Dziedzom Barnor"
              autoComplete="name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <div className="flex flex-col gap-[9px]">
              <FieldLabel htmlFor="pd-phone">Phone number</FieldLabel>
              <div
                className={`flex h-11 rounded-md border overflow-hidden ${
                  phoneLocked ? 'border-neutral-200 bg-neutral-100' : 'border-neutral-300 bg-white focus-within:border-brand-navy-400'
                }`}
              >
                <PhonePrefix muted={phoneLocked} />
                <input
                  id="pd-phone"
                  type="tel"
                  inputMode="numeric"
                  readOnly={phoneLocked}
                  tabIndex={phoneLocked ? -1 : undefined}
                  value={form.phoneLocal}
                  onChange={(e) => update('phoneLocal', e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="548902177"
                  className={`flex-1 min-w-0 h-full px-3 text-sm outline-none bg-transparent placeholder:text-neutral-300 ${
                    phoneLocked ? 'text-neutral-500 cursor-default' : 'text-neutral-700'
                  }`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-[9px]">
              <FieldLabel htmlFor="pd-dob">Date of birth</FieldLabel>
              <div
                className="relative h-11 rounded-md border border-neutral-300 bg-white overflow-hidden flex focus-within:border-brand-navy-400 cursor-pointer"
                onClick={() => dateRef.current?.showPicker?.()}
              >
                <input
                  ref={dateRef}
                  id="pd-dob"
                  type="date"
                  max={today}
                  value={form.dob}
                  onChange={(e) => update('dob', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`flex-1 flex items-center px-4 text-sm tracking-[1.5px] ${form.dob ? 'text-neutral-700' : 'text-neutral-400'}`}>
                  {dobDisplay}
                </div>
                <div className="w-11 h-full bg-neutral-100 border-l border-neutral-300 flex items-center justify-center shrink-0">
                  <CalendarDays className="size-4 text-neutral-500" strokeWidth={1.25} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-[19px]">
          <div className="flex flex-col gap-[9px]">
            <FieldLabel htmlFor="pd-card">Ghana card number</FieldLabel>
            <TextInput
              id="pd-card"
              value={form.ghanaCardNumber}
              invalid={cardTouched && !cardValid}
              onChange={(e) => update('ghanaCardNumber', e.target.value.toUpperCase().slice(0, 15))}
              placeholder="GHA-XXXXXXXXX-X"
              maxLength={15}
              autoComplete="off"
            />
            {cardTouched && !cardValid && (
              <p className="text-[11px] text-brand-red-500">Format must be GHA-XXXXXXXXX-X (9 digits, then 1 digit).</p>
            )}
          </div>

          <div className="flex flex-col gap-[11px]">
            <FieldLabel>Ghana card photo</FieldLabel>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                acceptFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {form.ghanaCardPhoto ? (
              <div className="h-[81px] bg-white border border-neutral-300 rounded-[10px] shadow-[0_1px_5.25px_rgba(0,0,0,0.03)] pl-[23px] pr-5 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-[5px] min-w-0">
                  <span className="text-[11px] font-semibold text-neutral-500 truncate">{form.ghanaCardPhoto.name}</span>
                  <span className="flex items-center gap-3 text-[11px]">
                    <span className="text-neutral-450">{form.ghanaCardPhoto.sizeLabel}</span>
                    <span className="font-semibold text-brand-green-400">Completed</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => update('ghanaCardPhoto', null)}
                  className="text-neutral-400 hover:text-brand-red-500 transition-colors shrink-0"
                  aria-label="Remove Ghana card photo"
                >
                  <Trash2 className="size-6" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
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
                  acceptFile(e.dataTransfer.files?.[0]);
                }}
                className={`h-[129px] rounded-lg border-[1.5px] border-dashed border-brand-gold-500 flex flex-col items-center justify-center gap-[3px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-600/40 ${
                  isDragging ? 'bg-brand-gold-50' : 'bg-brand-gold-50/16 hover:bg-brand-gold-50/40'
                }`}
              >
                <ImageUp className="size-6 text-brand-gold-700" strokeWidth={1.5} />
                <span className="text-xs font-medium text-neutral-450">Click to upload or drag &amp; drop</span>
                <span className="text-[10px] text-neutral-450">PDF, JPG or PNG&nbsp;&nbsp;Max 10MB</span>
              </div>
            )}
            {photoError && <p className="text-[11px] text-brand-red-500">{photoError}</p>}
          </div>
        </div>
      </div>

      <StepFooter className="mt-8 md:mt-[50px]">
        <PrimaryButton disabled={progress < 100} onClick={handleSave}>
          Continue to documents
        </PrimaryButton>
      </StepFooter>
    </div>
  );
};

export default PersonalDetailsForm;
