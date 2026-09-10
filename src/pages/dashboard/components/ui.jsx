import { Check, ChevronDown, CircleAlert, Loader2 } from 'lucide-react';
import GhanaFlag from '../../../assets/images/ghana_flag.svg';

/* ------------------------------------------------------------------ */
/* Small presentational primitives shared by the applicant flow.       */
/* Styles follow the Figma "New Flow - Before appointment" section.    */
/* ------------------------------------------------------------------ */

export const FieldLabel = ({ children, className = '', ...rest }) => (
  <label className={`block text-[10px] font-semibold uppercase text-neutral-500 leading-normal ${className}`} {...rest}>
    {children}
  </label>
);

export const SectionLabel = ({ children, className = '' }) => (
  <span className={`block text-[10px] font-semibold uppercase text-neutral-500 leading-normal ${className}`}>{children}</span>
);

/** Solid navy CTA (e.g. "Continue to documents"). */
export const PrimaryButton = ({ children, disabled = false, loading = false, className = '', ...rest }) => (
  <button
    type="button"
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 h-11 px-8 rounded-md text-sm font-semibold whitespace-nowrap transition-all ${
      disabled || loading
        ? 'bg-brand-navy-500/38 text-white/38 cursor-not-allowed'
        : 'bg-brand-navy-500 text-white hover:bg-brand-navy-700 active:scale-[0.99]'
    } ${className}`}
    {...rest}
  >
    {loading && <Loader2 className="size-4 animate-spin" />}
    {children}
  </button>
);

/** Light grey "ghost" button (e.g. "Need help? Schedule call"). */
export const GhostButton = ({ children, className = '', ...rest }) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center h-11 px-[23px] rounded-md bg-neutral-50 text-sm font-semibold text-brand-navy-500 whitespace-nowrap hover:bg-neutral-100 transition-colors ${className}`}
    {...rest}
  >
    {children}
  </button>
);

/** Gold pill button (e.g. "New application", "Start application"). */
export const GoldButton = ({ children, className = '', disabled = false, ...rest }) => (
  <button
    type="button"
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-[5px] h-9 px-4 rounded-md bg-brand-gold-500 text-sm font-semibold text-brand-navy-700 whitespace-nowrap hover:bg-brand-gold-600 transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...rest}
  >
    {children}
  </button>
);

/** 24px checkbox glyph (19px rounded square inside), matching Figma's checkmark-square-02. */
export const CheckSquare = ({ checked = false, className = '' }) => (
  <span className={`inline-flex size-6 items-center justify-center shrink-0 ${className}`} aria-hidden="true">
    <span
      className={`size-[19px] rounded-[4.5px] border-[1.5px] flex items-center justify-center transition-colors ${
        checked ? 'bg-brand-navy-500 border-brand-navy-500' : 'bg-transparent border-neutral-300'
      }`}
    >
      {checked && <Check className="size-3.5 text-brand-gold-50" strokeWidth={2.5} />}
    </span>
  </span>
);

/** Blue-grey informational banner with an alert icon. */
export const InfoBanner = ({ children, className = '', center = false }) => (
  <div
    className={`w-full rounded-[10px] border border-brand-navy-200 bg-brand-navy-50/30 px-[10px] py-5 flex items-center gap-[10px] ${
      center ? 'justify-center' : ''
    } ${className}`}
  >
    <CircleAlert className="size-6 shrink-0 text-brand-navy-400" strokeWidth={1.5} />
    <p className="text-sm text-brand-navy-400 leading-snug">{children}</p>
  </div>
);

/** 136 x 9 progress pill + percentage. */
export const ProgressBar = ({ value = 0, completed = false }) => {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="flex items-end gap-1.5">
      <div className="w-[136px] h-[9px] rounded-full bg-neutral-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-green-500 transition-all duration-500 ease-out"
          style={{ width: `max(${pct}%, 12px)` }}
        />
      </div>
      <span className={`text-sm leading-none ${completed ? 'font-semibold text-brand-green-500' : 'font-medium text-neutral-400'}`}>
        {pct}%
      </span>
    </div>
  );
};

/** Ghana flag + "+233" prefix cell used inside phone inputs. */
export const PhonePrefix = ({ muted = true }) => (
  <div className="flex items-center gap-1 h-full pl-[9px] pr-2 bg-neutral-100 shrink-0 w-[90px]">
    <img src={GhanaFlag} alt="" className="w-[14px] h-[11px]" />
    <span className={`text-sm ${muted ? 'text-neutral-300' : 'text-neutral-500'}`}>+233</span>
    <ChevronDown className={`size-4 ${muted ? 'text-neutral-300' : 'text-neutral-400'}`} strokeWidth={1} />
  </div>
);

/** 44px text input. `readOnly` renders the grey pre-filled style. */
export const TextInput = ({ readOnly = false, invalid = false, className = '', ...rest }) => (
  <input
    readOnly={readOnly}
    tabIndex={readOnly ? -1 : undefined}
    className={`w-full h-11 rounded-md border px-4 text-sm outline-none transition-colors placeholder:text-neutral-300 ${
      readOnly
        ? 'bg-neutral-100 border-neutral-200 text-neutral-500 cursor-default'
        : invalid
          ? 'bg-white border-brand-red-500 text-neutral-700'
          : 'bg-white border-neutral-300 text-neutral-700 focus:border-brand-navy-400'
    } ${className}`}
    {...rest}
  />
);

/** Footer row inside an expanded step card: hairline divider + right-aligned actions. */
export const StepFooter = ({ children, between = false, className = '' }) => (
  <div
    className={`pt-5 border-t border-[#f1f1f1] flex flex-col sm:flex-row sm:items-center gap-4 ${
      between ? 'sm:justify-between' : 'sm:justify-end'
    } ${className}`}
  >
    {children}
  </div>
);

/** Pill badge used in tables and document cards. */
const BADGE_VARIANTS = {
  pending:   'bg-brand-gold-100 text-[#7a6209]',
  completed: 'bg-brand-green-50 text-brand-green-800',
  accepted:  'bg-brand-green-50 text-brand-green-500 border border-brand-green-100',
  queued:    'bg-[#f1f5f9] text-[#475569] border border-[#d6e8f9]',
  submitted: 'bg-blue-50 text-blue-700',
  rejected:  'bg-red-50 text-red-700',
  director:  'bg-purple-50 text-purple-700',
  neutral:   'bg-neutral-100 text-neutral-600',
};

export const Badge = ({ variant = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center h-6 px-[10px] rounded-full text-[13px] font-semibold whitespace-nowrap ${BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral} ${className}`}>
    {children}
  </span>
);

const statusToBadgeVariant = (status) => {
  switch (status) {
    case 'Pending review': return 'pending';
    case 'Approved':
    case 'Completed': return 'completed';
    case 'Submitted': return 'submitted';
    case 'Rejected': return 'rejected';
    case 'Forwarded to Director': return 'director';
    default: return 'neutral';
  }
};

export const ApplicationStatusBadge = ({ status, className = '' }) => (
  <Badge variant={statusToBadgeVariant(status)} className={className}>{status}</Badge>
);
