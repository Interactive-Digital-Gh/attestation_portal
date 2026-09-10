import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { formatLongDate, fromISODate, formatSlotTime24 } from '../documentTypes';

/**
 * Success screen shown after "Confirm and submit" (Figma: Step 4-complete B).
 */
const ApplicationSubmittedSuccess = ({ application, onTrack }) => {
  const [copied, setCopied] = useState(false);
  const appId = application?.id || 'ATT-XXXX-XXXXX';
  const appt = application?.appointment_details;
  const apptLabel = appt?.date
    ? `${formatLongDate(fromISODate(appt.date))} at ${formatSlotTime24(appt.time)}`
    : 'to be confirmed';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(appId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const bullets = [
    'Verification of your documents starts now and runs before your appointment date.',
    `Your appointment is ${apptLabel}.`,
    'Bring the original documents and your Ghana Card. Originals are checked against what you uploaded.',
    'If a document fails verification we will notify you, cancel the appointment and refund your fee.',
  ];

  return (
    <div className="animate-fade-in-up flex flex-col items-center pt-8 lg:pt-[112px] pb-24 px-2">
      <div className="w-full max-w-[581px] p-[10px] flex flex-col items-center gap-10 lg:gap-[43px]">
        {/* Ringed check */}
        <div className="relative size-[71px] shrink-0" aria-hidden="true">
          <span className="absolute inset-0 rounded-full bg-brand-green-50" />
          <span className="absolute inset-[5px] rounded-full bg-brand-green-100" />
          <span className="absolute inset-[11px] rounded-full bg-brand-green-200" />
          <span className="absolute inset-[18px] rounded-full bg-brand-green-500 flex items-center justify-center">
            <Check className="size-6 text-brand-gold-50" strokeWidth={2} />
          </span>
        </div>

        <div className="flex flex-col gap-[9px] text-center max-w-[411px]">
          <h2 className="text-2xl font-semibold text-brand-navy-500">Your application has been submitted</h2>
          <p className="text-base text-neutral-450 leading-snug">
            An SMS has been sent to your registered number with your appointment details and reference number.
          </p>
        </div>

        <div className="w-full min-h-[66px] rounded-[10px] border border-brand-green-100 bg-brand-green-50/20 shadow-[0_1px_10.5px_rgba(0,0,0,0.03)] pl-4 pr-6 py-3 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold uppercase text-neutral-450">Application ID</span>
          <div className="flex items-center gap-[10px]">
            <span className="text-xl sm:text-2xl font-semibold text-brand-navy-500 tracking-tight">{appId}</span>
            <button
              type="button"
              onClick={copyId}
              aria-label={copied ? 'Application ID copied' : 'Copy application ID'}
              className="text-[#6f8eae] hover:text-brand-navy-500 transition-colors"
            >
              {copied ? <Check className="size-6" strokeWidth={1.5} /> : <Copy className="size-6" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <ul className="w-full max-w-[426px] flex flex-col gap-[23px]">
          {bullets.map((text) => (
            <li key={text} className="flex items-center gap-[10px]">
              <span className="size-[5px] rounded-full bg-brand-navy-500 shrink-0" aria-hidden="true" />
              <span className="text-base text-neutral-450 leading-snug">{text}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onTrack}
          className="w-full max-w-[466px] h-11 rounded-md bg-brand-navy-500 text-white text-sm font-semibold hover:bg-brand-navy-700 transition-colors active:scale-[0.99]"
        >
          Track my application
        </button>
      </div>
    </div>
  );
};

export default ApplicationSubmittedSuccess;
