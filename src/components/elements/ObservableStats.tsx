// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useMemo } from 'react';

interface ObservableStatsProps {
  tramStatuses: string[];
}

const ObservableStats: React.FC<ObservableStatsProps> = ({ tramStatuses }) => {
  const { numAccepted, numRejected, unprocessed } = useMemo(() => {
    const numAccepted = tramStatuses.reduce((acc, cur) => (cur === 'accepted' ? acc + 1 : acc), 0);
    const numRejected = tramStatuses.reduce((acc, cur) => (cur === 'rejected' ? acc + 1 : acc), 0);
    const unprocessed = tramStatuses.length - (numAccepted + numRejected);
    return { numAccepted, numRejected, unprocessed };
  }, [tramStatuses]);

  return (
    <div className="flex flex-row pl-5 pr-5 pt-5 pb-5 bg-gray-600 rounded-t-xl">
      <div className="text-xs mr-4 grow">
        Observables Found
        <span className="badge badge-xs border-0 bg-gray-900 ml-1 pt-2 pb-2">
          {tramStatuses.length}
        </span>
      </div>
      <div className="text-xs mr-4 grow">
        Observables Accepted
        <span className="badge badge-xs border-0 bg-gray-900 ml-1 pt-2 pb-2">
          {numAccepted}
        </span>
      </div>
      <div className="text-xs mr-4 grow">
        Observables Rejected
        <span className="badge badge-xs border-0 bg-gray-900 ml-1 pt-2 pb-2">
          {numRejected}
        </span>
      </div>
      <div className="text-xs mr-4 grow">
        Observables Unprocessed
        <span className="badge badge-xs border-0 bg-gray-900 ml-1 pt-2 pb-2">
          {unprocessed}
        </span>
      </div>
    </div>
  );
};

export default ObservableStats;
