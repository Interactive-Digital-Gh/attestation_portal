import { useOutletContext } from 'react-router-dom';

const TrackStatusPage = () => {
  const { applications, setSelectedApplication } = useOutletContext();

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Submitted':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'Pending review':
        return 'bg-[#fef6b8] text-[#7a6209] border border-[#f5e6a0]';
      case 'Approved':
      case 'Completed':
        return 'bg-[#e5f4ed] text-[#004728] border border-[#c3e6d5]';
      case 'Rejected':
        return 'bg-red-50 text-red-700 border border-red-100';
      default:
        return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
    }
  };

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-brand-navy-800 text-[20px] lg:text-[24px] xl:text-[28px] font-bold tracking-tight mb-4 xl:mb-6">Track Status</h2>
      {applications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((app, index) => (
            <div key={index} className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{app.id}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${getStatusStyle(app.status)}`}>
                  {app.status}
                </span>
              </div>
              <h3 className="text-[14px] font-bold text-brand-navy-800 mb-1">{app.document_type}</h3>
              <div className="space-y-2 mt-3 pt-3 border-t border-neutral-50">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Submitted</span>
                  <span className="font-semibold text-neutral-600">{new Date(app.submitted_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Appointment</span>
                  <span className="font-semibold text-neutral-600">{app.appointment_details?.date || 'N/A'}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedApplication(app)}
                className="w-full mt-4 py-2 bg-neutral-50 hover:bg-neutral-100 text-brand-navy-800 rounded-lg text-xs font-bold transition-all"
              >
                Detailed Status
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-100">
          <p className="text-neutral-400 font-medium">No applications to track yet.</p>
        </div>
      )}
    </div>
  );
};

export default TrackStatusPage;
