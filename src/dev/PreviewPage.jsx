/**
 * DEV-ONLY visual preview of the applicant flow screens with mock auth/data.
 * Registered in App.jsx under `/__preview/*` only when `import.meta.env.DEV`.
 *
 *   /__preview/applications        empty state (no applications for the mock user)
 *   /__preview/table               applications table with sample rows
 *   /__preview/chooser             "Who is this application for?"
 *   /__preview/steps/step1..step4  the four-step form at each step
 *   /__preview/steps/review        Step 4 in the review phase
 *   /__preview/success             submitted screen
 */
import { Routes, Route, Outlet, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Dashboard from '../pages/dashboard/Dashboard';
import ApplicationsPage from '../pages/dashboard/ApplicationsPage';
import ApplicantTypeSelection from '../pages/dashboard/components/ApplicantTypeSelection';
import NewApplicationSteps from '../pages/dashboard/components/NewApplicationSteps';
import AppointmentBookingForm from '../pages/dashboard/components/AppointmentBookingForm';
import ApplicationSubmittedSuccess from '../pages/dashboard/components/ApplicationSubmittedSuccess';
import { DOCUMENT_STATUS, addWorkingDays } from '../pages/dashboard/documentTypes';

const noop = () => {};

const mockAuth = {
  user: { id: '00000000-0000-0000-0000-000000000000', email: 'ama@example.com' },
  profile: { id: '00000000-0000-0000-0000-000000000000', full_name: 'Ama Dziedzom Barnor', phone_number: '+233548902177', role: 'user' },
  loading: false,
  signOut: noop,
};

const personalDetails = {
  fullName: 'Ama Dziedzom Barnor',
  phoneNumber: '+233548902177',
  phoneLocal: '548902177',
  dob: '1994-05-14',
  ghanaCardNumber: 'GHA-456789021-8',
  ghanaCardPhoto: { name: 'ghana_card_front.jpg', size: 891289, sizeLabel: '0.85 MB' },
};

const doc = (id, type, verification, status) => ({
  id,
  type,
  verification,
  name: 'wassce_bece_certificate_2026.pdf',
  size: 2306867,
  sizeLabel: '2.2 MB',
  status,
});

const documents = [
  doc('d1', 'Marriage certificate', 'upload', DOCUMENT_STATUS.ACCEPTED),
  doc('d2', 'WASSCE or BECE certificate', 'officer', DOCUMENT_STATUS.QUEUED),
  doc('d3', 'Police report', 'officer', DOCUMENT_STATUS.QUEUED),
  doc('d4', 'Certificate of incorporation', 'officer', DOCUMENT_STATUS.QUEUED),
  doc('d5', 'University transcript', 'officer', DOCUMENT_STATUS.QUEUED),
];

const payment = {
  tier: 'Standard',
  ratePerDocument: 200,
  documentsCount: 5,
  total: 1000,
  price: 1000,
  currency: 'GHS',
  paymentMethod: 'momo',
  momoNetwork: 'MTN MoMo',
  momoPhoneLocal: '548902177',
  accountName: 'Ama Dziedzom Barnor',
};

const STEP_STATES = {
  step1: { expandedStep: 1, completedSteps: [] },
  step2: { expandedStep: 2, completedSteps: [1], data: { personalDetails } },
  'step2-filled': { expandedStep: 2, completedSteps: [1], data: { personalDetails, documents } },
  step3: { expandedStep: 3, completedSteps: [1, 2], data: { personalDetails, documents } },
  'step3-selected': { expandedStep: 3, completedSteps: [1, 2], data: { personalDetails, documents, payment } },
  step4: { expandedStep: 4, completedSteps: [1, 2, 3], data: { personalDetails, documents, payment } },
};

const sampleApplications = [
  { id: 'ATT-2026-00847', document_type: 'Marriage cert.', submitted_at: '2026-04-11', status: 'Pending review', appointment_details: { date: '2026-04-22', time: '9:00 AM' } },
  { id: 'ATT-2026-00812', document_type: 'Marriage cert.', submitted_at: '2026-04-11', status: 'Completed', appointment_details: { date: '2026-04-12', time: '10:00 AM' } },
  { id: 'ATT-2026-00790', document_type: 'Birth certificate', submitted_at: '2026-04-11', status: 'Completed', appointment_details: { date: '2026-04-12', time: '11:00 AM' } },
  { id: 'ATT-2026-00733', document_type: 'Police report', submitted_at: '2026-04-11', status: 'Completed', appointment_details: { date: '2026-04-11', time: '8:00 AM' } },
  { id: 'ATT-2026-00701', document_type: 'Marriage cert.', submitted_at: '2026-04-11', status: 'Completed', appointment_details: { date: '2026-04-10', time: '12:00 PM' } },
];

const TablePreview = () => (
  <Routes>
    <Route element={<Outlet context={{ applications: sampleApplications, isLoading: false, setSelectedApplication: noop }} />}>
      <Route index element={<ApplicationsPage />} />
    </Route>
  </Routes>
);

const StepsPreview = () => {
  const { state } = useParams();
  return (
    <NewApplicationSteps
      applicantType="self"
      onBack={noop}
      onTrack={noop}
      initialState={STEP_STATES[state] || STEP_STATES.step1}
    />
  );
};

const ReviewPreview = () => (
  <div className="max-w-[1199px]">
    <div className="rounded-[10px] border border-neutral-200 bg-white shadow-[0_1px_5.25px_rgba(0,0,0,0.03)] px-[25px] py-5">
      <AppointmentBookingForm
        initialData={{ date: '2026-08-28', time: '2:00 PM', id: 'slot-1' }}
        serviceTier="Standard"
        earliestDate={addWorkingDays(new Date(), 5)}
        summary={{ applicantName: 'Ama Dziedzom', applicantType: 'self', documents, tier: 'Standard', documentsCount: 5, total: 1000 }}
        onSubmit={noop}
        initialPhase="review"
      />
    </div>
  </div>
);

const SuccessPreview = () => (
  <ApplicationSubmittedSuccess
    application={{ id: 'ATT-2026-00847', appointment_details: { date: '2026-08-28', time: '2:00 PM' } }}
    onTrack={noop}
  />
);

const PreviewPage = () => (
  <AuthContext.Provider value={mockAuth}>
    <Routes>
      <Route path="/" element={<Dashboard />}>
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="table/*" element={<TablePreview />} />
        <Route path="chooser" element={<ApplicantTypeSelection onStart={noop} />} />
        <Route path="steps/review" element={<ReviewPreview />} />
        <Route path="steps/:state" element={<StepsPreview />} />
        <Route path="success" element={<SuccessPreview />} />
      </Route>
    </Routes>
  </AuthContext.Provider>
);

export default PreviewPage;
