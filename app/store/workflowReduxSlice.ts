// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Task {
  title: string;
  isCompleted: boolean;
}

interface WorkflowStep {
  label: string;
  link: string;
  tasks: Task[];
}

interface WorkflowState {
  steps: WorkflowStep[];
}

const initialWorkflowState: WorkflowState = {
  steps: [
    {
      label: 'Collection/Processing',
      link: 'collection-processing',
      tasks: [
        { title: 'Gather Sources', isCompleted: false },
        { title: 'Initial Review of Sources', isCompleted: false },
        { title: 'Submit Approved Sources', isCompleted: false },
        { title: 'Process Entities', isCompleted: false },
        { title: 'Initial Review of Output', isCompleted: false },
        { title: 'Submit Approved Entities', isCompleted: false },
      ],
    },
    {
      label: 'Analysis',
      link: 'analysis',
      tasks: [
        { title: 'Analyze Entities', isCompleted: false },
        { title: 'Sequence Tactic and Technique', isCompleted: false },
        { title: 'Initial Review of T2 Sequence', isCompleted: false },
        { title: 'Submit', isCompleted: false },
        { title: 'Sequence Observables', isCompleted: false },
        { title: 'Initial Review of Obs Sequence', isCompleted: false },
        { title: 'Submit', isCompleted: false },
        { title: 'Add additional Data required (STIX and BAM)', isCompleted: false },
      ],
    },
    {
      label: 'Dissemination',
      link: 'dissemination',
      tasks: [
        { title: 'Select Report Output Format', isCompleted: false },
        { title: 'Select File Export Format', isCompleted: false },
      ],
    },
  ],
};

const workflowSlice = createSlice({
  name: 'workflow',
  initialState: initialWorkflowState,
  reducers: {
    setWorkflowSteps(state, action: PayloadAction<WorkflowStep[]>) {
      state.steps = action.payload;
    },
    toggleTaskCompleted(state, action: PayloadAction<{ stepIndex: number; taskIndex: number }>) {
      const { stepIndex, taskIndex } = action.payload;
      const task = state.steps[stepIndex].tasks[taskIndex];
      task.isCompleted = !task.isCompleted;
    },
  },
});

export const { setWorkflowSteps, toggleTaskCompleted } = workflowSlice.actions;
export default workflowSlice.reducer;
