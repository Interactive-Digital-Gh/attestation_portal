import { useState } from 'react';
import { User, Users, Check } from 'lucide-react';

const OPTIONS = [
  {
    id: 'self',
    title: 'Myself',
    description: 'The documents belong to you and you can attend the appointment in person.',
    icon: User,
  },
  {
    id: 'other',
    title: 'Someone else',
    description: 'You are applying on behalf of a person who is absent, disabled, or unable to read.',
    icon: Users,
  },
];

/**
 * First screen of a new application: "Who is this application for?"
 * (Figma: Home - start application). The CTA appears once an option is chosen.
 */
const ApplicantTypeSelection = ({ onStart, initialValue = null }) => {
  const [selected, setSelected] = useState(initialValue);

  return (
    <div className="animate-fade-in-up flex flex-col items-center pt-6 lg:pt-[74px] pb-24">
      <h2 className="text-brand-navy-500 text-[26px] lg:text-[32px] font-medium text-center tracking-tight mb-8 lg:mb-[54px]">
        Who is this application for?
      </h2>

      <div role="radiogroup" aria-label="Who is this application for?" className="w-full max-w-[670px] flex flex-col gap-5 lg:gap-[35px]">
        {OPTIONS.map(({ id, title, description, icon: Icon }) => {
          const isSelected = selected === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(id)}
              className={`w-full text-left bg-white rounded-[10px] shadow-[0_1px_5.25px_rgba(0,0,0,0.03)] px-5 py-6 lg:py-[30px] flex items-center gap-4 lg:gap-[19px] border-[1.5px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-400/40 ${
                isSelected ? 'border-brand-navy-400' : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <span className="size-[55px] rounded-[10px] border border-neutral-300 flex items-center justify-center shrink-0">
                <Icon className="size-8 text-neutral-400" strokeWidth={2} />
              </span>
              <span className="flex flex-col gap-[9px] min-w-0 flex-1">
                <span className="text-base font-semibold text-neutral-700">{title}</span>
                <span className="text-sm text-neutral-500 leading-snug">{description}</span>
              </span>
              {isSelected && (
                <span className="size-6 flex items-center justify-center shrink-0" aria-hidden="true">
                  <span className="size-[19px] rounded-[4.5px] bg-brand-navy-500 flex items-center justify-center">
                    <Check className="size-3.5 text-white" strokeWidth={2.5} />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          type="button"
          onClick={() => onStart(selected)}
          className="mt-10 lg:mt-14 w-full max-w-[473px] h-11 rounded-md bg-brand-gold-500 hover:bg-brand-gold-600 text-brand-navy-700 text-sm font-semibold transition-all active:scale-[0.99] animate-fade-in-up"
        >
          Start application
        </button>
      )}
    </div>
  );
};

export default ApplicantTypeSelection;
