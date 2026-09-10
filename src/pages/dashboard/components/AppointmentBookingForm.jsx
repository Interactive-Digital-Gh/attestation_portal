import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2, CircleAlert } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { PrimaryButton, CheckSquare, InfoBanner, StepFooter } from './ui';
import {
  toISODate,
  fromISODate,
  formatLongDate,
  formatGHS,
  splitSlotTime,
  slotTimeToMinutes,
  formatSlotTime24,
  requiresOfficerVerification,
  getOfficerVerificationSummary,
  OFFICER_VERIFICATION_DAYS,
} from '../documentTypes';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DECLARATION =
  'I declare that the information in this application is true, that every document attached is a genuine original bearing the official Supreme Court or Judicial Service seal, and that I accept full legal accountability for this submission. I understand that a false declaration is an offence.';

const tierFilter = (tier) =>
  tier === 'Standard' ? ['Standard only', 'Standard + Express'] : ['Express only', 'Standard + Express'];

const joinList = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const DAY_STYLES = {
  prev: 'text-neutral-300',
  next: 'bg-neutral-100 text-neutral-300',
  unavailable: 'bg-neutral-100 text-neutral-300 cursor-not-allowed',
  full: 'bg-brand-red-100 text-neutral-700 cursor-not-allowed',
  available:
    'bg-white border border-neutral-200 text-neutral-700 shadow-[0_1px_5.25px_rgba(0,0,0,0.03)] hover:border-brand-gold-600 cursor-pointer',
  selected: 'bg-brand-gold-300 border border-brand-gold-600 text-neutral-700 shadow-[0_1px_5.25px_rgba(0,0,0,0.03)] cursor-pointer',
};

const Legend = ({ swatchClass, children }) => (
  <span className="flex items-center gap-[5px]">
    <span className={`size-[19px] rounded-[5.5px] ${swatchClass}`} aria-hidden="true" />
    {children}
  </span>
);

/**
 * Loads the tier-eligible slots for a month plus current booking counts and
 * returns { 'yyyy-mm-dd': { slots: [{...slot, remaining}], remaining } }.
 */
const loadMonthAvailability = async (month, serviceTier) => {
  const start = toISODate(new Date(month.getFullYear(), month.getMonth(), 1));
  const end = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0));

  const { data: slots, error: slotErr } = await supabase
    .from('appointment_slots')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .eq('is_available', true)
    .in('tier', tierFilter(serviceTier));
  if (slotErr) throw slotErr;

  const counts = {};
  try {
    const { data: bookings } = await supabase
      .from('applications')
      .select('appointment_details')
      .gte('appointment_details->>date', start)
      .lte('appointment_details->>date', end)
      .not('status', 'eq', 'Rejected');
    bookings?.forEach((b) => {
      const d = b.appointment_details?.date;
      const t = b.appointment_details?.time;
      if (d && t) counts[`${d}|${t}`] = (counts[`${d}|${t}`] || 0) + 1;
    });
  } catch (err) {
    console.warn('Could not fetch booking counts:', err);
  }

  const map = {};
  (slots || []).forEach((s) => {
    const remaining = Math.max(0, (s.capacity ?? 5) - (counts[`${s.date}|${s.time}`] || 0));
    if (!map[s.date]) map[s.date] = { slots: [], remaining: 0 };
    map[s.date].slots.push({ ...s, remaining });
    map[s.date].remaining += remaining;
  });
  Object.values(map).forEach((d) => d.slots.sort((x, y) => slotTimeToMinutes(x.time) - slotTimeToMinutes(y.time)));
  return map;
};

/**
 * Step 4 — Book appointment slot, then review and submit.
 * phase "pick": notice + calendar + hour list.  phase "review": summary + statutory declaration.
 */
const AppointmentBookingForm = ({
  initialData,
  serviceTier = 'Standard',
  earliestDate = null,
  summary,
  onSubmit,
  isSubmitting = false,
  submitError = null,
  onProgressUpdate,
  initialPhase = 'pick',
}) => {
  const todayISO = toISODate(new Date());
  const earliestISO = earliestDate ? toISODate(earliestDate) : todayISO;
  const minISO = earliestISO > todayISO ? earliestISO : todayISO;

  const [phase, setPhase] = useState(initialPhase);
  const [month, setMonth] = useState(() => {
    const base = initialData?.date ? fromISODate(initialData.date) : fromISODate(minISO);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(initialData?.date || '');
  const [selectedSlot, setSelectedSlot] = useState(
    initialData?.id ? { id: initialData.id, time: initialData.time } : null
  );
  const [dayMap, setDayMap] = useState({});
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState(null);
  const [declared, setDeclared] = useState(false);

  // The month is "loading" until data for this month/tier combination has arrived.
  const monthKey = `${month.getFullYear()}-${month.getMonth()}-${serviceTier}`;
  const isLoading = loadedKey !== monthKey;

  /* ---------- data ---------- */
  useEffect(() => {
    let active = true;
    const key = monthKey;
    const refresh = () =>
      loadMonthAvailability(month, serviceTier)
        .then((map) => {
          if (!active) return;
          setDayMap(map);
          setError(null);
          setLoadedKey(key);
        })
        .catch((err) => {
          if (!active) return;
          console.error('Error loading appointment slots:', err);
          setError('Could not load appointment slots. Please try again.');
          setLoadedKey(key);
        });

    refresh();
    const channel = supabase
      .channel(`appointment_slots_${key}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_slots' }, refresh)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [month, serviceTier, monthKey]);

  const progress = selectedSlot ? 100 : selectedDate ? 50 : 0;
  useEffect(() => {
    onProgressUpdate?.(progress);
  }, [progress, onProgressUpdate]);

  /* ---------- calendar ---------- */
  const cells = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const list = [];
    for (let i = lead - 1; i >= 0; i -= 1) list.push({ key: `p${i}`, day: prevDays - i, kind: 'prev' });
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(y, m, d);
      list.push({ key: `c${d}`, day: d, kind: 'current', iso: toISODate(date), weekend: date.getDay() === 0 || date.getDay() === 6 });
    }
    let next = 1;
    while (list.length % 7 !== 0) list.push({ key: `n${next}`, day: next++, kind: 'next' });
    return list;
  }, [month]);

  const dayState = (cell) => {
    if (cell.kind !== 'current') return cell.kind;
    if (cell.iso === selectedDate) return 'selected';
    if (cell.weekend || cell.iso < minISO) return 'unavailable';
    const info = dayMap[cell.iso];
    if (!info) return 'unavailable';
    return info.remaining > 0 ? 'available' : 'full';
  };

  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const canGoPrev = month > currentMonthStart;
  const shiftMonth = (delta) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const selectDay = (cell) => {
    setSelectedDate(cell.iso);
    setSelectedSlot(null);
  };

  const slots = selectedDate ? dayMap[selectedDate]?.slots || [] : [];
  const { types, issuers } = getOfficerVerificationSummary(summary?.documents || []);

  /* ---------- review rows ---------- */
  const reviewRows = useMemo(() => {
    if (!summary) return [];
    const seen = new Set();
    const docRows = [];
    (summary.documents || []).forEach((d) => {
      if (seen.has(d.type)) return;
      seen.add(d.type);
      docRows.push([
        d.type,
        requiresOfficerVerification(d) ? `Officer verification, up to ${OFFICER_VERIFICATION_DAYS} working days` : 'Checked on upload',
      ]);
    });
    return [
      ['Applicant', `${summary.applicantName || '—'}, ${summary.applicantType === 'self' ? 'self' : 'someone else'}`],
      ...docRows,
      [
        `${summary.tier} tier, ${summary.documentsCount} document${summary.documentsCount === 1 ? '' : 's'}`,
        `${formatGHS(summary.total)} paid`,
      ],
      [
        'Appointment',
        selectedDate && selectedSlot ? `${formatLongDate(fromISODate(selectedDate))} ${formatSlotTime24(selectedSlot.time)}` : '—',
      ],
    ];
  }, [summary, selectedDate, selectedSlot]);

  /* ---------- render ---------- */
  if (phase === 'review') {
    return (
      <div className="flex flex-col gap-[30px]">
        <div className="flex flex-col gap-[21px]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-[9px]">
              <h4 className="text-sm font-semibold text-neutral-700">Summary of the booking</h4>
              <p className="text-sm text-neutral-500">Check if all information are correct</p>
            </div>
            <button
              type="button"
              onClick={() => setPhase('pick')}
              className="text-sm font-semibold text-brand-navy-400 hover:underline shrink-0"
            >
              Change appointment
            </button>
          </div>
          <dl className="flex flex-col gap-[18px] max-w-[845px]">
            {reviewRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-6 text-sm">
                <dt className="text-neutral-600">{label}</dt>
                <dd className="text-neutral-800 text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-[10px] border border-brand-gold-500 bg-brand-gold-50/33 px-[10px] py-5 flex flex-col gap-[19px]">
          <div className="pl-3 flex flex-col gap-4">
            <h5 className="text-sm font-semibold text-brand-gold-800">Statutory declaration</h5>
            <p className="text-sm text-neutral-700 leading-[1.23] max-w-[975px]">{DECLARATION}</p>
          </div>
          <label className="flex items-center gap-[7px] cursor-pointer pl-1 select-none">
            <input type="checkbox" className="sr-only" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
            <CheckSquare checked={declared} />
            <span className="text-sm text-neutral-700">I make this declaration and confirm my application.</span>
          </label>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 text-sm text-brand-red-500" role="alert">
            <CircleAlert className="size-5 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{submitError}</span>
          </div>
        )}

        <StepFooter between>
          <p className="text-sm font-medium text-neutral-700 leading-6">
            Bring your original documents and your Ghana Card to the appointment.
          </p>
          <PrimaryButton
            disabled={!declared || !selectedSlot}
            loading={isSubmitting}
            onClick={() => onSubmit({ date: selectedDate, time: selectedSlot.time, id: selectedSlot.id })}
          >
            {isSubmitting ? 'Submitting…' : 'Confirm and submit'}
          </PrimaryButton>
        </StepFooter>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[19px]">
      {earliestDate && earliestISO > todayISO && (
        <InfoBanner>
          <span className="font-semibold">Dates before {formatLongDate(earliestDate)} are unavailable.</span> Your{' '}
          {joinList(types)} {types.length > 1 ? 'are' : 'is'} still being confirmed with {joinList(issuers)}.
        </InfoBanner>
      )}

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-[57px] items-start">
        {/* Calendar */}
        <div className="w-full lg:w-[473px] shrink-0 flex flex-col gap-[15px]">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-neutral-700">Choose day</h4>
            <div className="flex items-center gap-[10px] p-[10px] text-neutral-500">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={!canGoPrev}
                aria-label="Previous month"
                className="disabled:opacity-30 hover:text-neutral-700 transition-colors"
              >
                <ChevronLeft className="size-6" strokeWidth={1.5} />
              </button>
              <span className="text-base font-medium min-w-[110px] text-center">
                {month.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="hover:text-neutral-700 transition-colors"
              >
                <ChevronRight className="size-6" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-[25px]">
            <div className="grid grid-cols-7 gap-x-2 sm:gap-x-[30px] gap-y-4 justify-items-center">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={`wd-${i}`}
                  className={`w-10 text-center text-base font-semibold py-[10px] ${i >= 5 ? 'text-neutral-200' : 'text-neutral-700'}`}
                >
                  {d}
                </div>
              ))}
              {cells.map((cell) => {
                const state = dayState(cell);
                const clickable = state === 'available' || state === 'selected';
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && selectDay(cell)}
                    aria-pressed={state === 'selected'}
                    aria-label={cell.iso ? `${formatLongDate(fromISODate(cell.iso))}, ${state}` : undefined}
                    className={`w-10 h-[38px] rounded-[10px] text-base font-semibold flex items-center justify-center transition-colors ${DAY_STYLES[state]}`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-[21px] text-xs font-medium text-neutral-450">
              <Legend swatchClass="bg-neutral-50 border-[1.5px] border-neutral-200">Available</Legend>
              <Legend swatchClass="bg-brand-red-100">Fully booked</Legend>
              <Legend swatchClass="bg-brand-gold-300">Selected</Legend>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="w-full lg:w-[352px] shrink-0 flex flex-col gap-6 lg:gap-[37px]">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-neutral-700">Choose hour</h4>
            <span className="text-base font-medium text-neutral-500 p-[10px]">Ghana(UTC+00:00)</span>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 className="size-5 animate-spin text-brand-gold-600" />
              Checking availability…
            </div>
          ) : !selectedDate ? (
            <p className="text-sm text-neutral-400">Select an available day to see its hours.</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-neutral-400">No hours are configured for this day.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {slots.map((slot) => {
                const { hour, period } = splitSlotTime(slot.time);
                const isSel = selectedSlot?.id === slot.id;
                const full = slot.remaining <= 0;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={full}
                    aria-pressed={isSel}
                    onClick={() => setSelectedSlot({ id: slot.id, time: slot.time })}
                    className={`h-12 rounded-[10px] border pl-6 sm:pl-[39px] pr-6 sm:pr-[37px] flex items-center justify-between transition-colors ${
                      full
                        ? 'bg-neutral-100 border-neutral-100 cursor-not-allowed'
                        : isSel
                          ? 'bg-brand-gold-50 border-brand-gold-600 shadow-[0_1px_5.25px_rgba(0,0,0,0.03)]'
                          : 'bg-white border-neutral-100 shadow-[0_1px_5.25px_rgba(0,0,0,0.03)] hover:border-neutral-300'
                    }`}
                  >
                    <span className="flex items-baseline gap-[5px]">
                      <span className={`text-base font-semibold ${full ? 'text-neutral-300' : 'text-neutral-700'}`}>{hour}</span>
                      <span className={`text-sm ${full ? 'text-neutral-300' : 'text-neutral-600'}`}>{period}</span>
                    </span>
                    <span
                      className={`text-xs ${
                        full ? 'text-neutral-300' : slot.remaining === 1 ? 'text-brand-red-500' : 'text-neutral-400'
                      }`}
                    >
                      {full ? 'Fully booked' : `${slot.remaining} slot${slot.remaining === 1 ? '' : 's'} left`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-brand-red-500" role="alert">
          {error}
        </p>
      )}

      <StepFooter className="mt-3">
        <PrimaryButton disabled={!selectedDate || !selectedSlot} onClick={() => setPhase('review')}>
          Continue to review
        </PrimaryButton>
      </StepFooter>
    </div>
  );
};

export default AppointmentBookingForm;
