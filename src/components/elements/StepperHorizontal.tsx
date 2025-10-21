// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import ButtonIcon from './ButtonIcon';
import { IProgressItem } from '../../../app/types/types';

type StepperHorizontalProps = {
  steps: IProgressItem[];
  activeStepIndex: number;
  handleStepClick: (index: number) => void;
  onTaskToggle: (stepIndex: number, taskIndex: number) => void;
};

const StepperHorizontal: React.FC<StepperHorizontalProps> = ({
  steps,
  activeStepIndex,
  handleStepClick,
  onTaskToggle,
}) => {
  const [clickedStepIndex, setClickedStepIndex] = useState<number | null>(null);

  const calculateStepStatus = (steps: IProgressItem[]): (IProgressItem & { isCompleted: boolean; isStarted: boolean })[] => {
    return steps.map(step => {
      const isCompleted = step.tasks.every(task => task.isCompleted);
      const isStarted = step.tasks.some(task => task.isCompleted);
      return { ...step, isCompleted, isStarted };
    });
  };

  const updatedSteps = calculateStepStatus(steps);

  return (
    <div className="flex justify-center items-center">
      <ul className="steps steps-horizontal overflow-visible">
        {updatedSteps.map((step, index) => {
          const isCurrentOrPreviousStepActive = step.isStarted || step.isCompleted;
          const isPreviousStepActive = index > 0 && (updatedSteps[index - 1].isStarted || updatedSteps[index - 1].isCompleted);

          return (
            <li
              key={index}
              className={`step w-24 relative ${
                isCurrentOrPreviousStepActive && isPreviousStepActive ? 'before:!bg-primary' : 'before:!bg-neutral'
              } ${
                index <= activeStepIndex ? 'step-primary after:!hidden' : 'step-neutral after:!hidden'
              }`}
              onClick={() => handleStepClick(index)}
              onMouseDown={() => setClickedStepIndex(index)}
            >
              <div
                className={`
                  absolute
                  w-6
                  h-6
                  z-10
                  cursor-pointer
                  rounded-full
                  flex
                  justify-center
                  items-center
                  ${step.isCompleted ? 'bg-primary text-white' : 'bg-white dark:bg-neutral text-gray-900 dark:text-white'}
                  ${step.isStarted || step.isCompleted ? 'border-2 border-primary text-white' : 'border-2 border-neutral'}
                `}
              >
                {step.isCompleted && (
                  <span className="material-icons text-white transform scale-75">
                    check
                  </span>
                )}
                {clickedStepIndex === index && (
                  <div className="absolute top-0 right-full mr-2 bg-slate-400 dark:bg-gray-800 text-white rounded shadow-lg z-10 whitespace-nowrap">
                    <div className="flex justify-between items-center pt-1 px-4">
                      <h3 className="font-bold whitespace-nowrap mr-4 text-base-content dark:text-gray-300">{step.label} Checklist</h3>
                      <div className="mt-[3px] -mr-2">
                        <ButtonIcon
                          label="Close"
                          buttonIcon="close"
                          color="btn-ghost"
                          buttonSize="btn-sm"
                          onClick={() => setClickedStepIndex(null)}
                        />
                      </div>
                    </div>
                    <div className="py-2 pl-4 pr-6 flex">
                      <ul className="list-none text-left pl-2">
                        {step.tasks.map((task, taskIndex) => (
                          <li key={taskIndex} className="flex items-center mb-2">
                            <label className="custom-checkbox-container">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  className="custom-checkbox"
                                  checked={task.isCompleted}
                                  onChange={() => onTaskToggle(index, taskIndex)}
                                />
                                <span className="custom-checkbox-checkmark"></span>
                              </div>
                              <span className="ml-3 text-base-content dark:text-gray-300 text-sm whitespace-nowrap">{task.title}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs mb-2 absolute -top-[1rem]">{step.label}</div>

              {/* Add caret icon between steps */}
              {index < updatedSteps.length - 1 && (
                <div className="absolute mt-[3px] top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 z-10">
                  <span className="material-icons text-gray-300 dark:text-gray-900" style={{ fontSize: '48px' }}>
                    chevron_right
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default StepperHorizontal;
