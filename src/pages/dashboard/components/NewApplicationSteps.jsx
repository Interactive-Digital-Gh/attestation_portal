import { useState, useMemo } from 'react';
import { ArrowLeft, FileText, Paperclip, CreditCard, CalendarCheck, Check, SquarePen } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { GhostButton, ProgressBar } from './ui';
import PersonalDetailsForm from './PersonalDetailsForm';
import UploadDocumentsForm from './UploadDocumentsForm';
import ServiceTierPaymentForm from './ServiceTierPaymentForm';
import AppointmentBookingForm from './AppointmentBookingForm';
import ApplicationSubmittedSuccess from './ApplicationSubmittedSuccess';
import { getEarliestAppointmentDate, formatGHS, summarizeDocumentTypes } from '../documentTypes';

const STEPS = [
  { id: 1, title: 'Complete profile', icon: FileText, showProgress: true },
  {
    id: 2,
    title: 'Upload documents',
    icon: Paperclip,
    showProgress: true,
    subtitle: 'Add all the documents you need attested in this submission. Each document needs its own seal confirmation.',
  },
  {
    id: 3,
    title: 'Select service tier & pay',
    icon: CreditCard,
    subtitle: 'Choose how quickly you need your documents processed, then pay for this submission.',
  },
  {
    id: 4,
    title: 'Book appointment slot',
    icon: CalendarCheck,
    subtitle: 'Choose when you will deliver your original documents to the ministry.',
  },
];

const LOCKED_COPY = 'Complete the section above to continue with this step';

const generateApplicationNumber = () =>
  `ATT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;

/* ---------------------------------------------------------------- */
/* Presentational pieces of the step list                            */
/* ---------------------------------------------------------------- */

const StepBadge = ({ status, number }) => {
  if (status === 'completed') {
    return (
      <div className="size-[52px] rounded-full bg-brand-green-500 flex items-center justify-center">
        <Check className="size-6 text-brand-gold-50" strokeWidth={2} />
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className="size-[52px] rounded-full bg-brand-gold-600 flex items-center justify-center text-xl font-semibold text-brand-gold-50">
        {number}
      </div>
    );
  }
  return (
    <div className="size-[52px] rounded-full bg-white border border-neutral-300 flex items-center justify-center text-xl font-semibold text-neutral-200">
      {number}
    </div>
  );
};

const StepCard = ({ step, status, progress, detail, onEdit, children }) => {
  const Icon = step.icon;
  const isActive = status === 'active';
  const isDone = status === 'completed';

  return (
    <section
      aria-label={`Step ${step.id}: ${step.title}`}
      className={`rounded-[10px] border px-4 py-4 md:px-[25px] md:py-5 transition-colors ${
        isDone
          ? 'bg-brand-green-50 border-brand-green-400'
          : isActive
            ? 'bg-white border-neutral-200 shadow-[0_1px_5.25px_rgba(0,0,0,0.03)]'
            : 'bg-white border-neutral-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 md:gap-[19px] min-w-0">
          <div
            className={`size-[55px] rounded-[10px] border flex items-center justify-center shrink-0 ${
              isDone
                ? 'bg-brand-green-50 border-brand-green-200'
                : isActive
                  ? 'bg-brand-gold-50/50 border-brand-gold-600/50'
                  : 'bg-transparent border-neutral-300'
            }`}
          >
            <Icon
              className={`size-8 ${isDone ? 'text-brand-green-500' : isActive ? 'text-brand-gold-700' : 'text-neutral-400'}`}
              strokeWidth={2}
            />
          </div>

          <div className="flex flex-col gap-2 pt-0.5 min-w-0">
            <p className="text-sm leading-normal">
              <span className={isDone ? 'text-brand-green-500' : 'text-neutral-600'}>Step {step.id}: </span>
              <span className={`font-semibold ${isDone ? 'text-brand-green-500' : 'text-neutral-700'}`}>{step.title}</span>
            </p>
            {status === 'locked' && <p className="text-xs text-neutral-500">{LOCKED_COPY}</p>}
            {isActive && step.subtitle && <p className="text-xs text-neutral-500 max-w-[420px] leading-snug">{step.subtitle}</p>}
            {isDone && detail && <div className="text-sm text-neutral-700">{detail}</div>}
            {step.showProgress && isActive && <ProgressBar value={progress} />}
            {step.showProgress && isDone && <ProgressBar value={100} completed />}
          </div>
        </div>

        {isDone && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-[5px] text-base font-semibold text-brand-green-500 hover:text-brand-green-600 transition-colors shrink-0"
          >
            <SquarePen className="size-6" strokeWidth={1.5} />
            Edit
          </button>
        )}
      </div>

      {isActive && <div className="mt-5 md:mt-[22px]">{children}</div>}
    </section>
  );
};

/* ---------------------------------------------------------------- */
/* Orchestrator                                                       */
/* ---------------------------------------------------------------- */

/**
 * `initialState` lets previews/tests open the flow at a given step:
 * { expandedStep, completedSteps, progress, data }.
 */
const NewApplicationSteps = ({ applicantType = 'self', onBack, onTrack, onSubmitted, initialState = null }) => {
  const { user, profile } = useAuth();

  const [expandedStep, setExpandedStep] = useState(initialState?.expandedStep ?? 1);
  const [completedSteps, setCompletedSteps] = useState(initialState?.completedSteps ?? []);
  const [progress, setProgress] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, ...initialState?.progress });
  const [data, setData] = useState({
    personalDetails: null,
    documents: [],
    payment: null,
    appointment: null,
    ...initialState?.data,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(null);

  // Stable per-step progress setters so child effects don't re-run every render.
  const progressSetters = useMemo(() => {
    const make = (id) => (value) => setProgress((p) => (p[id] === value ? p : { ...p, [id]: value }));
    return { 1: make(1), 2: make(2), 3: make(3), 4: make(4) };
  }, []);

  const nextIncompleteStep = (done) => STEPS.map((s) => s.id).find((id) => !done.includes(id)) ?? 4;

  /**
   * Marks a step complete, stores its data and opens the next incomplete step.
   * `invalidateFrom` un-completes later steps whose inputs changed (e.g. the
   * payment total depends on the number of documents).
   */
  const completeStep = (id, patch, invalidateFrom = null) => {
    let done = completedSteps.filter((s) => invalidateFrom == null || s < invalidateFrom);
    if (!done.includes(id)) done = [...done, id].sort((a, b) => a - b);
    setData((prev) => ({ ...prev, ...patch }));
    setCompletedSteps(done);
    setProgress((p) => ({ ...p, [id]: 100 }));
    setExpandedStep(nextIncompleteStep(done));
  };

  const handleSaveStep1 = (personalDetails) => completeStep(1, { personalDetails });

  const handleSaveStep2 = (documents) => {
    const previous = data.documents;
    const changed =
      documents.length !== previous.length ||
      documents.some((d, i) => d.id !== previous[i]?.id || d.type !== previous[i]?.type);
    completeStep(2, { documents }, changed && data.payment ? 3 : null);
  };

  const handleSaveStep3 = (payment) => {
    const tierChanged = data.payment && data.payment.tier !== payment.tier;
    completeStep(3, { payment }, tierChanged ? 4 : null);
  };

  const handleFinalSubmit = async (appointment) => {
    if (!user) {
      setSubmitError('You must be logged in to submit an application.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const pd = data.personalDetails || {};
      const payment = data.payment || {};
      const appNumber = generateApplicationNumber();

      const uploadFile = async (file, path) => {
        const { error } = await supabase.storage
          .from('attestations')
          .upload(path, file, { upsert: true, cacheControl: '3600' });
        if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        return supabase.storage.from('attestations').getPublicUrl(path).data.publicUrl;
      };

      // Ghana Card photo (Step 1)
      let ghanaCardUrl = null;
      if (pd.ghanaCardPhoto?.file) {
        const ext = pd.ghanaCardPhoto.file.name.split('.').pop();
        try {
          ghanaCardUrl = await uploadFile(pd.ghanaCardPhoto.file, `${user.id}/${appNumber}/ghana_card.${ext}`);
        } catch (err) {
          console.error('Ghana card upload failed:', err);
        }
      }

      // Documents (Step 2)
      const uploadedDocs = [];
      for (const doc of data.documents) {
        const ext = (doc.name || 'file').split('.').pop();
        const url = doc.file ? await uploadFile(doc.file, `${user.id}/${appNumber}/${doc.id}.${ext}`) : doc.url || null;
        uploadedDocs.push({
          id: doc.id,
          type: doc.type,
          name: doc.name,
          size: doc.sizeLabel || doc.size,
          url,
          verification: doc.verification,
          status: doc.status,
        });
      }

      // Round-robin officer assignment (best effort)
      let assignedOfficerId = null;
      try {
        const { data: officerId } = await supabase.rpc('assign_officer_round_robin');
        if (officerId) assignedOfficerId = officerId;
      } catch (err) {
        console.warn('Could not auto-assign officer:', err);
      }

      const { ghanaCardPhoto, ...personalDetailsRest } = pd;
      const submission = {
        id: appNumber,
        user_id: user.id,
        assigned_officer_id: assignedOfficerId,
        full_name: pd.fullName || '',
        phone_number: pd.phoneNumber || '',
        dob: pd.dob || null,
        ghana_card_number: pd.ghanaCardNumber || '',
        ghana_card_url: ghanaCardUrl,
        personal_details: {
          ...personalDetailsRest,
          ghanaCardPhoto: ghanaCardPhoto
            ? { name: ghanaCardPhoto.name, size: ghanaCardPhoto.sizeLabel || ghanaCardPhoto.size, url: ghanaCardUrl }
            : null,
          applicantType,
          declarationAccepted: true,
          declarationAcceptedAt: new Date().toISOString(),
        },
        document_type: summarizeDocumentTypes(uploadedDocs),
        documents: uploadedDocs,
        service_tier: payment.tier || 'Standard',
        payment_details: payment,
        appointment_details: appointment,
        status: 'Pending review',
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('applications').insert([submission]);
      if (error) {
        if (error.code === '42501') {
          throw new Error('Permission denied: the applications table needs an INSERT policy for authenticated users.');
        }
        throw error;
      }

      await supabase
        .from('application_status_history')
        .insert([{ application_id: appNumber, status: 'Submitted', changed_by: user.id }]);

      setData((prev) => ({ ...prev, appointment }));
      setSubmitted(submission);
      onSubmitted?.(submission);
    } catch (err) {
      console.error('Error submitting application:', err);
      setSubmitError(err.message || 'Something went wrong while submitting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return <ApplicationSubmittedSuccess application={submitted} onTrack={onTrack || onBack} />;
  }

  const earliestDate = getEarliestAppointmentDate(data.documents);
  const applicantName = data.personalDetails?.fullName || profile?.full_name || '';

  const getStatus = (id) => (expandedStep === id ? 'active' : completedSteps.includes(id) ? 'completed' : 'locked');

  const collapsedDetail = (id) => {
    if (id === 2 && data.documents.length > 0) {
      const n = data.documents.length;
      return `${n} document${n === 1 ? '' : 's'} attached`;
    }
    if (id === 3 && data.payment) {
      return (
        <span className="flex flex-wrap gap-x-[10px]">
          <span>{data.payment.tier} tier</span>
          <span>{formatGHS(data.payment.total)} paid</span>
        </span>
      );
    }
    return null;
  };

  const renderForm = (id) => {
    switch (id) {
      case 1:
        return (
          <PersonalDetailsForm
            initialData={data.personalDetails}
            applicantType={applicantType}
            profile={profile}
            user={user}
            onSave={handleSaveStep1}
            onProgressUpdate={progressSetters[1]}
          />
        );
      case 2:
        return (
          <UploadDocumentsForm
            initialData={data.documents}
            onSave={handleSaveStep2}
            onProgressUpdate={progressSetters[2]}
          />
        );
      case 3:
        return (
          <ServiceTierPaymentForm
            initialData={data.payment}
            documents={data.documents}
            profile={profile}
            applicantName={applicantName}
            onSave={handleSaveStep3}
            onProgressUpdate={progressSetters[3]}
          />
        );
      case 4:
        return (
          <AppointmentBookingForm
            initialData={data.appointment}
            serviceTier={data.payment?.tier || 'Standard'}
            earliestDate={earliestDate}
            summary={{
              applicantName,
              applicantType,
              documents: data.documents,
              tier: data.payment?.tier || 'Standard',
              documentsCount: data.documents.length,
              total: data.payment?.total || 0,
            }}
            onSubmit={handleFinalSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onProgressUpdate={progressSetters[4]}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in-up max-w-[1330px]">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-8 lg:mb-[59px]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-neutral-500 hover:text-neutral-700 transition-colors group"
        >
          <ArrowLeft className="size-6 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
          Go back to Applications
        </button>
        <GhostButton onClick={() => window.open('mailto:support@mfa.gov.gh?subject=Attestation%20portal%20help', '_self')}>
          Need help? Schedule call
        </GhostButton>
      </div>

      {/* Step rail + cards */}
      <div className="flex flex-col">
        {STEPS.map((step, idx) => {
          const status = getStatus(step.id);
          const isLast = idx === STEPS.length - 1;
          return (
            <div key={step.id} className="flex gap-4 md:gap-[49px]">
              {/* Rail: the row's bottom gap lives on the card column so the connector spans it. */}
              <div className="hidden md:flex flex-col items-center w-[52px] shrink-0" aria-hidden="true">
                <div className="h-[21px] w-[2px]">
                  {idx > 0 && <div className="h-[13px] w-full rounded-full bg-neutral-200" />}
                </div>
                <StepBadge status={status} number={step.id} />
                {!isLast && (
                  <div className="flex-1 w-[2px] pt-2">
                    <div className="h-full w-full rounded-full bg-neutral-200" />
                  </div>
                )}
              </div>

              <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-6 md:pb-[37px]'}`}>
                <StepCard
                  step={step}
                  status={status}
                  progress={progress[step.id]}
                  detail={collapsedDetail(step.id)}
                  onEdit={() => setExpandedStep(step.id)}
                >
                  {status === 'active' && renderForm(step.id)}
                </StepCard>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NewApplicationSteps;
