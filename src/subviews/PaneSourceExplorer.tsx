// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetResultQuery,
  useUpdateHighlightRangeMutation,
  useDeleteHighlightRangeMutation,
  useUpdateEntityMutation
} from '../../app/services/client';
import { RootState } from '../../app/store';
import { createSelector } from '@reduxjs/toolkit';
import CardStatusNested from '../components/cards/CardStatusNested';
import CardContent from '../components/cards/CardContent';
import ButtonFunctionGroup from '../components/elements/ButtonFunctionGroup';
import ObservableStats from '../components/elements/ObservableStats';
import TramList from '../components/elements/TramList';
import HighlightedText from '../components/elements/HighlightedText';
import { Source } from '../../app/types/types';

const selectDerivedSourceId = (state: RootState) => state.sourceId.sourceId;
const selectLoading = (state: RootState) => state.sourceId.loading;

const selectResultData = createSelector(
  [selectDerivedSourceId, selectLoading],
  (currentDerivedSourceId, loading) => ({
    currentDerivedSourceId,
    loading,
  })
);

type SelectedSourceProps = {
  selectedSource: Source | null;
};

type ResultPrediction = {
  start_pos: number;
  end_pos: number;
  entity_label: string;
  entity_text: string;
  tramStatus: string;
  confidence: number;
};

const PaneSourceExplorer: React.FC<SelectedSourceProps> = ({ selectedSource }) => {
  const sourceTextMarkup = useMemo(() => selectedSource?.data.sourceText || '', [selectedSource]);
  const [updateEntity] = useUpdateEntityMutation();
  const [updateHighlightRange] = useUpdateHighlightRangeMutation();
  const [deleteHighlightRange] = useDeleteHighlightRangeMutation();
  const [activeView, setActiveView] = useState<string>('NLP');
  const [ranges, setRanges] = useState<[number, number][]>([]);
  const [tramStatuses, setTramStatuses] = useState<string[]>([]);

  const actions = useMemo(() => [
    { label: 'NLP Results', onClick: () => setActiveView('NLP') },
    { label: 'TRAM', onClick: () => setActiveView('TRAM') },
  ], []);

  const getSelectTramStatusOptions = useMemo(() => [
    { label: 'Review', value: 'review' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' },
  ], []);

  const getSelectEntityLabelOptions = useMemo(() => [
    { label: 'None', value: 'None' },
    { label: 'Item', value: 'Item' },
    { label: 'Date', value: 'Date' },
    { label: 'Technique', value: 'Technique' },
    { label: 'Tactic', value: 'Tactic' },
    { label: 'Org', value: 'Org' },
    { label: 'Event', value: 'Event' },
    { label: 'Location', value: '' },
  ], []);

  const { currentDerivedSourceId, loading } = useSelector(selectResultData);
  const { data: result, error, isLoading, refetch } = useGetResultQuery(currentDerivedSourceId!, { skip: !currentDerivedSourceId || loading, refetchOnReconnect: true });

  const sortPredictions = (predictions: ResultPrediction[]) => {
    return [...predictions].sort((a, b) => {
      if (a.start_pos === b.start_pos) {
        return a.end_pos - b.end_pos;
      }
      return a.start_pos - b.start_pos;
    });
  };

  const sortRanges = (ranges: [number, number][]) => {
    return [...ranges].sort((a, b) => {
      if (a[0] === b[0]) {
        return a[1] - b[1];
      }
      return a[0] - b[0];
    });
  };

  useEffect(() => {
    if (!selectedSource) {
      setTramStatuses([]);
      setRanges([]);
      return;
    }

    if (error) {
      setTramStatuses([]);
      setRanges([]);
      return;
    }

    if (result?.predictions?.length) {
      const sortedPredictions = sortPredictions(result.predictions);
      const initialStatuses = sortedPredictions.map(prediction => prediction.tramStatus);
      const initialRanges = sortedPredictions.map(({ start_pos, end_pos }) => [start_pos, end_pos] as [number, number]);

      setTramStatuses(initialStatuses);
      setRanges(initialRanges);
    } else {
      setTramStatuses([]);
      setRanges([]);
    }
  }, [result, selectedSource, error]);

  const handleEntityUpdate = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>, index: number, updateType: 'label' | 'tramStatus') => {
    if (!result) return;
    const selectedValue = e.target.value;

    if (updateType === 'tramStatus') {
      const updatedStatuses = [...tramStatuses];
      updatedStatuses[index] = selectedValue;
      setTramStatuses(updatedStatuses);
    }

    try {
      await updateEntity({
        resultId: result.derivedFromSourceId,
        index,
        updateType,
        newValue: selectedValue,
      }).unwrap();
      refetch();
    } catch (error) {
      console.error('Failed to update entity:', error);
    }
  }, [updateEntity, result, refetch, tramStatuses, selectedSource]);

  const handleTramStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>, index: number) => {
    handleEntityUpdate(e, index, 'tramStatus');
  }, [handleEntityUpdate]);

  const handleEntityLabelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>, index: number) => {
    handleEntityUpdate(e, index, 'label');
  }, [handleEntityUpdate]);

  const handleRangeUpdate = useCallback(async (updatedRange: [number, number], index: number) => {
    if (!result) return;

    let newRanges = [...ranges];
    if (index === -1) {
      newRanges.push(updatedRange);
    } else {
      newRanges[index] = updatedRange;
    }

    newRanges = sortRanges(newRanges);
    const entityText = sourceTextMarkup.substring(updatedRange[0], updatedRange[1]);

    try {
      if (result) {
        const payload = {
          resultId: result.derivedFromSourceId,
          updatedRanges: newRanges,
          entityText,
        };

        await updateHighlightRange(payload).unwrap();
      }
      refetch();
    } catch (error) {
      console.error('Failed to update highlight range:', error);
    }
  }, [ranges, sourceTextMarkup, result, updateHighlightRange, refetch]);

  const handleDeleteHighlight = useCallback(async (range: [number, number]) => {
    if (!result) return;

    try {
      if (result) {
        await deleteHighlightRange({ resultId: result.derivedFromSourceId, range }).unwrap();
      }
      refetch();
    } catch (error) {
      console.error('Failed to delete highlight range:', error);
    }
  }, [result, deleteHighlightRange, refetch]);

  const getSelectColorTramStatus = (status: string) => {
    switch (status) {
      case 'accepted': return 'tram-select-approved';
      case 'rejected': return 'tram-select-rejected';
      default: return 'tram-select-default';
    }
  };

  const indicesArray: Array<[number, number]> = useMemo(() => {
    return result?.predictions.map(({ start_pos, end_pos }) => [start_pos, end_pos]) || [];
  }, [result, tramStatuses]);

  const observableInfoArray: [string, number][] = useMemo(() => {
    return result?.predictions.map(({ entity_label, confidence }) => [entity_label, confidence]) || [];
  }, [result, tramStatuses]);

  const mergedRanges = useMemo(() => {
    const mergeRanges = (ranges: Array<[number, number]>): Array<[number, number]> => {
      ranges.sort((a, b) => a[0] - b[0]);
      const mergedRanges: Array<[number, number]> = [];

      for (const current of ranges) {
        if (!mergedRanges.length) {
          mergedRanges.push(current);
        } else {
          const last = mergedRanges[mergedRanges.length - 1];
          if (current[0] <= last[1]) {
            last[1] = Math.max(last[1], current[1]);
          } else {
            mergedRanges.push(current);
          }
        }
      }
      return mergedRanges;
    };

    return mergeRanges(indicesArray);
  }, [indicesArray]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <>
      {selectedSource ? (
        <CardStatusNested title="Source Explorer" type="normal" className="h-full w-full">
          <div className="absolute right-0 pr-4 space-x-3">
            <ButtonFunctionGroup actions={actions} buttonSize="btn-sm" />
          </div>
          <ObservableStats key={tramStatuses.join(',')} tramStatuses={tramStatuses} />

          <CardContent customPadding="h-full overflow-hidden" customClass="rounded-t-none">
            <div className="h-full overflow-hidden relative">
              <div className="h-full overflow-auto">
                {activeView === 'NLP' && (
                  <div className="source-explorer-text h-full overflow-hidden">
                    <HighlightedText
                      key={sourceTextMarkup}
                      text={sourceTextMarkup}
                      ranges={ranges}
                      setRanges={setRanges}
                      observableInfoArray={observableInfoArray}
                      predictions={sortPredictions(result?.predictions || [])}
                      getSelectTramStatusOptions={getSelectTramStatusOptions}
                      getSelectEntityLabelOptions={getSelectEntityLabelOptions}
                      handleTramStatusChange={handleTramStatusChange}
                      handleEntityLabelChange={handleEntityLabelChange}
                      getSelectColorTramStatus={getSelectColorTramStatus}
                      handleRangeUpdate={handleRangeUpdate}
                      handleDeleteHighlight={handleDeleteHighlight}
                    />
                  </div>
                )}
                {activeView === 'TRAM' && result && (
                  <TramList
                    result={result}
                    options={getSelectTramStatusOptions}
                    handleTramStatusChange={handleTramStatusChange}
                    getSelectColorTramStatus={getSelectColorTramStatus}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </CardStatusNested>
      ) : (
        <div className="flex w-full items-center justify-center">
          <div className="card flex py-6 px-20 bg-gray-700">
            Please select a source
          </div>
        </div>
      )}
    </>
  );
};

export default PaneSourceExplorer;
