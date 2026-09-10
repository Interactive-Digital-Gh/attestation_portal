import { useNavigate, useOutletContext } from 'react-router-dom';
import { Eye, Loader2 } from 'lucide-react';
import EmptyStateIllustration from '../../assets/images/illustration_fallback.png';
import { GoldButton, ApplicationStatusBadge } from './components/ui';

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

const formatAppointment = (appt) => {
  if (!appt?.date) return null;
  const date = formatDate(appt.date);
  return appt.time ? `${date} ${appt.time}` : date;
};

const COLUMNS = ['Application number', 'Document type', 'Submitted date', 'Status', 'Appointment'];

/**
 * Applications list (Figma: Home - empty state / Home - applications table).
 */
const ApplicationsPage = () => {
  const { applications, isLoading, setSelectedApplication } = useOutletContext();
  const navigate = useNavigate();
  const goToNewApplication = () => navigate('/dashboard/new-application');
  const hasApplications = applications.length > 0;

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-10 lg:mb-[100px] animate-fade-in-up">
        <h2 className="text-brand-navy-500 text-[26px] lg:text-[32px] font-medium tracking-tight">Applications</h2>
        {hasApplications && (
          <GoldButton onClick={goToNewApplication} className="min-w-[133px] text-[13px]">
            New application
          </GoldButton>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-brand-gold-500 animate-spin" />
          <p className="mt-4 text-neutral-400 font-medium">Loading your applications...</p>
        </div>
      ) : hasApplications ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-[20px] shadow-[0_4px_6.05px_rgba(0,0,0,0.06)] overflow-hidden animate-fade-in-up max-w-[1375px]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="bg-brand-navy-600 text-white">
                    {COLUMNS.map((label) => (
                      <th key={label} scope="col" className="h-[57px] pl-5 pr-[10px] text-sm font-semibold uppercase whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                    <th scope="col" className="h-[57px] pl-5 pr-5 w-[130px]">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="h-[59px] pl-5 pr-[10px] text-base font-semibold text-neutral-600 whitespace-nowrap">{app.id}</td>
                      <td className="pl-5 pr-[10px] text-base text-neutral-600">{app.document_type || '—'}</td>
                      <td className="pl-5 pr-[10px] text-base text-neutral-600 whitespace-nowrap">{formatDate(app.submitted_at)}</td>
                      <td className="pl-5 pr-[10px]">
                        <ApplicationStatusBadge status={app.status} />
                      </td>
                      <td className="pl-5 pr-[10px] text-base text-neutral-600 whitespace-nowrap">
                        {formatAppointment(app.appointment_details) || <span className="text-neutral-300">Not scheduled</span>}
                      </td>
                      <td className="pl-5 pr-5">
                        <button
                          type="button"
                          onClick={() => setSelectedApplication(app)}
                          className="flex items-center gap-[10px] text-base font-semibold text-brand-navy-500 hover:text-brand-navy-700 transition-colors"
                        >
                          <Eye className="size-6 text-[#141b34]" strokeWidth={1.5} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3 animate-fade-in-up">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider truncate">{app.id}</span>
                  <ApplicationStatusBadge status={app.status} />
                </div>
                <div className="px-4 pb-3">
                  <h3 className="text-base font-semibold text-neutral-700 leading-snug">{app.document_type || '—'}</h3>
                </div>
                <div className="h-px bg-neutral-100 mx-4" />
                <div className="px-4 py-3 flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-medium">Submitted</span>
                    <span className="font-semibold text-neutral-700">{formatDate(app.submitted_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-medium">Appointment</span>
                    <span className="font-semibold text-neutral-700">
                      {formatAppointment(app.appointment_details) || <span className="text-neutral-300 font-normal">Not scheduled</span>}
                    </span>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedApplication(app)}
                    className="w-full flex items-center justify-center gap-2 h-11 bg-brand-navy-500 hover:bg-brand-navy-700 text-white rounded-md text-sm font-semibold transition-all active:scale-[0.99]"
                  >
                    <Eye className="size-5" strokeWidth={1.5} />
                    View application
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-[17px] text-center animate-fade-in-up max-w-[411px] mx-auto">
          <img src={EmptyStateIllustration} alt="" className="w-[303px] max-w-full h-auto" />
          <div className="flex flex-col items-center gap-[30px]">
            <div className="flex flex-col gap-[9px]">
              <h3 className="text-2xl font-semibold text-brand-navy-500">No applications yet</h3>
              <p className="text-sm text-neutral-450 leading-relaxed">
                Start your first attestation request. It takes less than 10 minutes to submit your documents online.
              </p>
            </div>
            <GoldButton onClick={goToNewApplication} className="min-w-[133px]">
              New application
            </GoldButton>
          </div>
        </div>
      )}
    </>
  );
};

export default ApplicationsPage;
