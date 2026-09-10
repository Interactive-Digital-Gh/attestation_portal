import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ApplicantTypeSelection from './components/ApplicantTypeSelection';
import NewApplicationSteps from './components/NewApplicationSteps';

/**
 * New application flow:
 *   1. "Who is this application for?" (Myself / Someone else)
 *   2. Four-step form (profile → documents → tier & pay → appointment & submit)
 *   3. Success screen
 */
const NewApplicationPage = () => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const [applicantType, setApplicantType] = useState(null);

  if (!applicantType) {
    return <ApplicantTypeSelection onStart={setApplicantType} />;
  }

  return (
    <NewApplicationSteps
      applicantType={applicantType}
      onBack={() => navigate('/dashboard/applications')}
      onTrack={() => navigate('/dashboard/track-status')}
      onSubmitted={() => outlet.fetchApplications?.()}
    />
  );
};

export default NewApplicationPage;
