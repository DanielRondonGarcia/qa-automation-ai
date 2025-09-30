import React from 'react';
import { PipelineStep } from '../types';
import { Check } from 'lucide-react';

interface PipelineTrackerProps {
  currentStep: PipelineStep;
}

const steps = [PipelineStep.SETUP, PipelineStep.ANALYSIS, PipelineStep.REPORT];

const PipelineTracker: React.FC<PipelineTrackerProps> = ({ currentStep }) => {
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {stepIdx < currentStepIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-cyan-600" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 hover:bg-cyan-700"
                >
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
              </>
            ) : stepIdx === currentStepIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-700" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-cyan-600 bg-gray-800"
                  aria-current="step"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-600" aria-hidden="true" />
                </div>
                 <div className="absolute -bottom-8 w-max text-center">
                  <span className="text-sm font-medium text-cyan-400">{step}</span>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-700" />
                </div>
                <div
                  className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-600 bg-gray-800 hover:border-gray-500"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-500" aria-hidden="true" />
                </div>
                 <div className="absolute -bottom-8 w-max text-center">
                   <span className="text-sm font-medium text-gray-500">{step}</span>
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default PipelineTracker;