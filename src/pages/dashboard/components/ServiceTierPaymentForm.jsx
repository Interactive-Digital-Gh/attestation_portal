import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { FieldLabel, PrimaryButton, CheckSquare, InfoBanner, PhonePrefix, TextInput, StepFooter } from './ui';
import { formatGHS, formatLongDate, getEarliestAppointmentDate, getOfficerVerificationSummary } from '../documentTypes';

/** Fallback tiers (Figma values); overridden by active rows in `fees_config`. */
const DEFAULT_TIERS = [
  { key: 'Standard', price: 200, turnaround: '24 to 48 hours' },
  { key: 'Express', price: 450, turnaround: '24 to 48 hours' },
  { key: 'Premium', price: 800, turnaround: '24 to 48 hours' },
];
const NETWORKS = ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money'];
/** Simulated gateway round-trip; see handlePay. */
const PAYMENT_DELAY_MS = 1500;

const localDigits = (phone = '') => (phone || '').replace(/\D/g, '').replace(/^233/, '').replace(/^0/, '');
const turnaroundLabel = (days) => (!days ? null : days === 1 ? '1 working day' : `Up to ${days} working days`);
const joinList = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const SegButton = ({ active, children, ...rest }) => (
  <button
    type="button"
    aria-pressed={active}
    className={`h-11 w-[140px] rounded-md text-sm font-semibold transition-colors ${
      active
        ? 'bg-white border-[1.5px] border-brand-navy-500 text-brand-navy-500'
        : 'bg-neutral-50 text-brand-navy-800 hover:bg-neutral-100'
    }`}
    {...rest}
  >
    {children}
  </button>
);

const Field = ({ label, htmlFor, children }) => (
  <div className="flex flex-col gap-[9px]">
    <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
    {children}
  </div>
);

/**
 * Step 3 — Select service tier & pay.
 * Pricing is per document; the selected tier card expands to show the order summary.
 */
const ServiceTierPaymentForm = ({ initialData, documents = [], profile, applicantName, onSave, onProgressUpdate }) => {
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [tier, setTier] = useState(initialData?.tier || null);
  const [method, setMethod] = useState(initialData?.paymentMethod || 'momo');
  const [network, setNetwork] = useState(initialData?.momoNetwork || '');
  const [phone, setPhone] = useState(initialData?.momoPhoneLocal || localDigits(profile?.phone_number));
  const [card, setCard] = useState({ name: initialData?.cardName || '', number: '', expiry: '', cvv: '' });
  const [isPaying, setIsPaying] = useState(false);

  // Merge admin-configured fees over the defaults.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('fees_config')
      .select('tier, price_ghs, turnaround_days, is_active')
      .then(({ data, error }) => {
        if (cancelled || error || !data?.length) return;
        const byName = Object.fromEntries(data.map((r) => [r.tier, r]));
        const merged = DEFAULT_TIERS.filter((t) => byName[t.key]?.is_active !== false).map((t) => {
          const row = byName[t.key];
          return row
            ? { key: t.key, price: Number(row.price_ghs), turnaround: turnaroundLabel(row.turnaround_days) || t.turnaround }
            : t;
        });
        data
          .filter((r) => r.is_active !== false && !DEFAULT_TIERS.some((t) => t.key === r.tier))
          .forEach((r) =>
            merged.push({ key: r.tier, price: Number(r.price_ghs), turnaround: turnaroundLabel(r.turnaround_days) || '24 to 48 hours' })
          );
        setTiers(merged);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const documentsCount = documents.length;
  const selectedTier = tiers.find((t) => t.key === tier) || null;
  const total = selectedTier ? selectedTier.price * documentsCount : 0;

  const momoReady = !!network && phone.length >= 9;
  // Simulated account-name lookup: the payer is the signed-in account holder.
  const accountName = momoReady ? profile?.full_name || applicantName || '' : '';
  const cardDigits = card.number.replace(/\s/g, '');
  const cardReady = card.name.trim().length > 1 && cardDigits.length >= 16 && card.expiry.length >= 4 && card.cvv.length >= 3;
  const canPay = !!selectedTier && documentsCount > 0 && (method === 'momo' ? momoReady : cardReady);

  const progress = !selectedTier ? 0 : canPay ? 66 : 33;
  useEffect(() => {
    onProgressUpdate?.(progress);
  }, [progress, onProgressUpdate]);

  const earliest = getEarliestAppointmentDate(documents);
  const { types, issuers } = getOfficerVerificationSummary(documents);

  const handlePay = async () => {
    if (!canPay) return;
    setIsPaying(true);
    // Payment gateway integration point: replace this delay with the provider's
    // checkout call (e.g. Paystack / Hubtel) and only continue once it confirms.
    await new Promise((resolve) => setTimeout(resolve, PAYMENT_DELAY_MS));
    setIsPaying(false);
    onSave({
      tier: selectedTier.key,
      ratePerDocument: selectedTier.price,
      documentsCount,
      total,
      price: total,
      currency: 'GHS',
      paymentMethod: method,
      momoNetwork: method === 'momo' ? network : null,
      momoPhone: method === 'momo' ? `+233${phone}` : null,
      momoPhoneLocal: method === 'momo' ? phone : null,
      accountName: method === 'momo' ? accountName : null,
      cardName: method === 'card' ? card.name.trim() : null,
      cardLast4: method === 'card' ? cardDigits.slice(-4) : null,
      paidAt: new Date().toISOString(),
      reference: `PAY-${Date.now().toString(36).toUpperCase()}`,
    });
  };

  return (
    <div className="flex flex-col gap-[19px]">
      <div className="flex flex-col lg:flex-row lg:justify-between gap-8 lg:gap-12">
        {/* Tier list */}
        <div role="radiogroup" aria-label="Service tier" className="w-full lg:max-w-[495px] flex flex-col gap-[10px]">
          {tiers.map((t) => {
            const isSelected = tier === t.key;
            return (
              <div
                key={t.key}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => setTier(t.key)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setTier(t.key)}
                className={`rounded-[10px] border px-[15px] py-5 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-400/40 ${
                  isSelected ? 'bg-white border-brand-navy-400' : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className={`flex items-start justify-between gap-4 ${isSelected ? 'pb-2 border-b border-neutral-100' : ''}`}>
                  <div className="flex items-start gap-[5px]">
                    <CheckSquare checked={isSelected} />
                    <div className="flex flex-col gap-[3px]">
                      <span className="text-sm font-medium text-neutral-700">{t.key}</span>
                      <span className="text-xs text-neutral-600">{t.turnaround}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-[3px] items-end text-right">
                    <span className="text-sm font-semibold text-neutral-600">{formatGHS(t.price)}</span>
                    <span className="text-xs font-medium text-neutral-400">per document</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="pt-[14px] pb-2 flex flex-col gap-[21px] text-xs animate-fade-in">
                    <span className="font-semibold uppercase text-neutral-400">Order summary</span>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Documents</span>
                        <span className="text-neutral-700">{documentsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Rate per document</span>
                        <span className="text-neutral-700">{t.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-neutral-400">Total</span>
                        <span className="font-semibold text-neutral-700">{formatGHS(total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment column */}
        {selectedTier && (
          <div className="w-full lg:max-w-[431px] flex flex-col gap-[18px] animate-fade-in">
            <h4 className="text-sm font-semibold text-neutral-700">Payment method</h4>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-[15px]">
                <SegButton active={method === 'momo'} onClick={() => setMethod('momo')}>
                  Mobile money
                </SegButton>
                <SegButton active={method === 'card'} onClick={() => setMethod('card')}>
                  Credit card
                </SegButton>
              </div>

              {method === 'momo' ? (
                <>
                  <Field label="Mobile network" htmlFor="pay-network">
                    <div className="relative">
                      <select
                        id="pay-network"
                        value={network}
                        onChange={(e) => setNetwork(e.target.value)}
                        className={`w-full h-11 rounded-md border border-neutral-200 bg-white pl-4 pr-11 text-sm appearance-none outline-none focus:border-brand-navy-400 ${
                          network ? 'text-neutral-600' : 'text-neutral-300'
                        }`}
                      >
                        <option value="" disabled>
                          Select network
                        </option>
                        {NETWORKS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-[15px] top-1/2 -translate-y-1/2 size-6 text-neutral-400 pointer-events-none"
                        strokeWidth={1.5}
                      />
                    </div>
                  </Field>

                  <Field label="Phone number" htmlFor="pay-phone">
                    <div className="flex h-11 rounded-md border border-neutral-200 bg-white overflow-hidden focus-within:border-brand-navy-400">
                      <PhonePrefix />
                      <input
                        id="pay-phone"
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="548902177"
                        className="flex-1 min-w-0 h-full px-3 text-sm outline-none text-neutral-600 placeholder:text-neutral-300"
                      />
                    </div>
                  </Field>

                  <Field label="Name on account" htmlFor="pay-account">
                    <TextInput id="pay-account" readOnly value={accountName} placeholder="Display account name" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Name on card" htmlFor="pay-card-name">
                    <TextInput
                      id="pay-card-name"
                      value={card.name}
                      onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                      placeholder="Name on card"
                      autoComplete="cc-name"
                    />
                  </Field>
                  <Field label="Card number" htmlFor="pay-card-number">
                    <TextInput
                      id="pay-card-number"
                      inputMode="numeric"
                      value={card.number}
                      onChange={(e) =>
                        setCard((c) => ({
                          ...c,
                          number: e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '),
                        }))
                      }
                      placeholder="0000 0000 0000 0000"
                      autoComplete="cc-number"
                      className="tracking-[0.08em]"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-[15px]">
                    <Field label="Expiry" htmlFor="pay-card-expiry">
                      <TextInput
                        id="pay-card-expiry"
                        inputMode="numeric"
                        value={card.expiry}
                        onChange={(e) =>
                          setCard((c) => ({ ...c, expiry: e.target.value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(?=\d)/, '$1/') }))
                        }
                        placeholder="MM/YY"
                        autoComplete="cc-exp"
                      />
                    </Field>
                    <Field label="CVV" htmlFor="pay-card-cvv">
                      <TextInput
                        id="pay-card-cvv"
                        inputMode="numeric"
                        type="password"
                        value={card.cvv}
                        onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        placeholder="•••"
                        autoComplete="cc-csc"
                      />
                    </Field>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedTier && earliest && types.length > 0 && (
        <InfoBanner>
          <span className="font-semibold">Earliest appointment: {formatLongDate(earliest)}.</span> Held by your {joinList(types)},
          which {types.length > 1 ? 'need' : 'needs'} confirmation from {joinList(issuers)}.
        </InfoBanner>
      )}

      <StepFooter className="mt-1">
        <PrimaryButton disabled={!canPay} loading={isPaying} onClick={handlePay}>
          {isPaying ? 'Processing payment…' : 'Proceed to pay'}
        </PrimaryButton>
      </StepFooter>
    </div>
  );
};

export default ServiceTierPaymentForm;
