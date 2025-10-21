// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import PaneSTIX from '../subviews/PaneSTIX';
import PaneReportText from '../subviews/PaneReportText';
import ButtonFunctionGroup from '../components/elements/ButtonFunctionGroup';
import { useOutletContext } from 'react-router-dom';
import { AppReport } from '../../app/types/types';

type Props = object;

const ViewReportAnalysis: React.FC<Props> = () => {
  const { reportSelected, setIsDirty } = useOutletContext<{ reportSelected: AppReport, setIsDirty: (value: boolean) => void }>();
  const [activeView, setActiveView] = useState<string>('Compare'); // Default to Compare

  const options = [
    { label: 'Load saved version', value: '00' },
    { label: 'Some saved version 1', value: '01' },
    { label: 'Some saved version 2', value: '02' }
  ];
  const actions = [
    { label: 'Compare', onClick: () => setActiveView('Compare') },
    { label: 'Code', onClick: () => setActiveView('Code') },
    { label: 'Text', onClick: () => setActiveView('Text') }
  ];

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-row bg-gray-200 dark:bg-gray-700 px-10 py-5">
        <div className="flex-col"><h2 className="text-2xl mr-3">Analysis</h2></div>
        <div className="flex-col grow">
          <div className="flex flex-row-reverse">
            <div className="flex space-x-3">
              <div className="space-x-3 mr-0">
                <span>View: </span>
                <ButtonFunctionGroup actions={actions} buttonSize="btn-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeView === 'Compare' && (
        <PanelGroup direction="horizontal">
          <Panel minSize={25} className="flex">
            <PaneSTIX reportSelected={reportSelected} />
          </Panel>
          <PanelResizeHandle className="bg-gray-200 dark:bg-gray-700 cursor-col-resize flex justify-center items-center">
            <span className="material-icons text-gray-900 transform rotate-90 -ml-1.5 -mr-1.5">drag_handle</span>
          </PanelResizeHandle>
          <Panel minSize={25} className="flex flex-1">
            <PaneReportText reportSelected={reportSelected} setIsDirty={setIsDirty} />
          </Panel>
        </PanelGroup>
      )}

      {activeView === 'Code' && (
        <div className="flex flex-1">
          <PaneSTIX reportSelected={reportSelected} />
        </div>
      )}

      {activeView === 'Text' && (
        <div className="flex flex-1">
          <PaneReportText reportSelected={reportSelected} setIsDirty={setIsDirty} />
        </div>
      )}
    </div>
  );
};

export default ViewReportAnalysis;