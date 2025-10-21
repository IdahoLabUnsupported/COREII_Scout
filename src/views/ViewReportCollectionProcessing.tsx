// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { useClientApi } from '../../app/hooks/useClientApi';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import PaneSourceExplorer from '../subviews/PaneSourceExplorer';
import PaneSourcesList from '../subviews/PaneSourcesList';
import DialogAddSource from '../components/dialogs/DialogAddSource';
import { Source } from '../../app/types/types';

const ViewReportCollectionProcessing: React.FC = () => {
  const { reports, sources, reportSelected, enrichedSourceList, handleSelectReport } = useClientApi();
  const selectedReportIndex = useSelector((state: RootState) => state.appState.selectedReportIndex);

  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  useEffect(() => {
    if (selectedReportIndex !== null) {
      handleSelectReport(selectedReportIndex);
    }
  }, [selectedReportIndex, handleSelectReport]);

  const handleSourceSelect = (source: Source) => {
    setSelectedSource(source);
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-row bg-gray-200 dark:bg-gray-700 px-10 py-5">
        <h2 className="text-2xl mr-3">Sources</h2>
        <DialogAddSource
          title="Add Source"
          buttonType="icon"
          buttonIcon="add"
          buttonColor="btn-ghost"
          buttonSize="btn-sm"
          buttonLabel="Add Source"
        />
      </div>
      <PanelGroup direction="horizontal" className="flex-grow h-full">
        <Panel defaultSize={50} minSize={25} className="flex h-full p-6">
          {reportSelected && (
            <PaneSourcesList 
              reportSelected={{ ...reportSelected, sourceList: enrichedSourceList }} 
              sourcesData={sources} 
              onSourceSelect={handleSourceSelect}
            />
          )}
        </Panel>
        <PanelResizeHandle className="bg-gray-200 dark:bg-gray-700 cursor-col-resize flex justify-center items-center">
          <span className="material-icons text-gray-900 transform rotate-90 -ml-1.5 -mr-1.5">drag_handle</span>
        </PanelResizeHandle>
        <Panel minSize={25} className="h-full w-full p-6">
          <PaneSourceExplorer selectedSource={selectedSource} />
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default ViewReportCollectionProcessing;
