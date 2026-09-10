import { useOutletContext } from 'react-router-dom';

const InvoicesPage = () => {
  const { applications } = useOutletContext();

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-brand-navy-800 text-[20px] lg:text-[24px] xl:text-[28px] font-bold tracking-tight mb-4 xl:mb-6">Invoices</h2>
      {applications.length > 0 ? (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="bg-neutral-50 px-6 py-3 flex items-center text-neutral-400 uppercase text-[11px] font-bold tracking-wider border-b border-neutral-100">
            <div className="w-[25%]">Invoice ID</div>
            <div className="w-[30%]">Application</div>
            <div className="w-[20%]">Date</div>
            <div className="w-[15%]">Type</div>
            <div className="w-[10%] text-right">Amount</div>
          </div>
          <div className="flex flex-col divide-y divide-neutral-50">
            {applications.map((app, index) => {
              const amount = app.service_tier?.toLowerCase().includes('express') ? 450 : 200;
              return (
                <div key={index} className="px-6 py-3.5 flex items-center hover:bg-neutral-50/30 transition-colors">
                  <div className="w-[25%] font-bold text-brand-navy-800 text-[13px]">INV-{app.id.split('-')[2]}</div>
                  <div className="w-[30%] text-neutral-500 text-[13px]">{app.document_type}</div>
                  <div className="w-[20%] text-neutral-500 text-[13px]">{new Date(app.submitted_at).toLocaleDateString()}</div>
                  <div className="w-[15%]">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide ${app.service_tier?.toLowerCase().includes('express') ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                      {app.service_tier || 'Standard'}
                    </span>
                  </div>
                  <div className="w-[10%] text-right font-black text-brand-navy-800 text-[13px]">GHS {amount}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-100">
          <p className="text-neutral-400 font-medium">No invoices found.</p>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
