// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import TableSourceList from '../components/elements/tables/TableSourceList';
import CardContent from '../components/cards/CardContent';
import CardStatusNested from '../components/cards/CardStatusNested';
import { AppReport, Source } from '../../app/types/types';

type LayoutSourcesProps = {
  reportSelected: AppReport;
  sourcesData: Source[];
  onSourceSelect: (source: Source) => void;  // Add the prop type
};

const PaneSourcesList: React.FC<LayoutSourcesProps> = ({ reportSelected, sourcesData, onSourceSelect }) => {

  return (
    <div className="view-pane-component flex flex-col w-full h-full overflow-auto">
      <CardStatusNested title={'Source List'} type="normal" className="h-full !mb-0">
        <span className="absolute left-32 pt-[3px]">{reportSelected.sourceList.length} sources</span>
        <CardContent customPadding='p-0 h-full overflow-auto'>
          <div className="h-full overflow-auto">
            <TableSourceList 
              reportSelected={reportSelected} 
              onSourceSelect={onSourceSelect}  // Pass the handler
            />
          </div>
        </CardContent>
      </CardStatusNested>
    </div>
  );
};

export default React.memo(PaneSourcesList, (prevProps, nextProps) => {
  return (
    prevProps.reportSelected.sourceList === nextProps.reportSelected.sourceList &&
    prevProps.sourcesData === nextProps.sourcesData
  );
});
