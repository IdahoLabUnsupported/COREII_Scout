// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useRef, useState, useCallback, Dispatch, SetStateAction } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import CustomTooltipModule from '../elements/textEditors/CustomTooltipModule';
import ButtonIcon from '../../components/elements/ButtonIcon';
import { result } from 'lodash';

Quill.register('modules/customTooltip', CustomTooltipModule);

type ResultPrediction = {
  start_pos: number;
  end_pos: number;
  entity_label: string;
  entity_text: string;
  tramStatus: string;
  confidence: number;
};

interface HighlightedTextProps {
  ranges: [number, number][];
  setRanges: Dispatch<SetStateAction<[number, number][]>>;
  observableInfoArray: [string, number][];
  predictions: ResultPrediction[];
  getSelectTramStatusOptions: { label: string; value: string }[];
  getSelectEntityLabelOptions: { label: string; value: string }[];
  handleTramStatusChange: (e: React.ChangeEvent<HTMLSelectElement>, index: number) => void;
  handleEntityLabelChange: (e: React.ChangeEvent<HTMLSelectElement>, index: number) => void;
  getSelectColorTramStatus: (status: string) => string;
  handleRangeUpdate: (updatedRange: [number, number], index: number) => void;
  handleDeleteHighlight: (range: [number, number]) => void;
  text: string;
}

interface CustomTooltipModuleType {
  showTooltip(
    range: { index: number; length: number },
    content: string,
    confidence: number,
    tramStatus: string,
    getSelectTramStatusOptions: { label: string; value: string }[],
    getSelectEntityLabelOptions: { label: string; value: string }[],
    handleTramStatusChange: (e: React.ChangeEvent<HTMLSelectElement>, index: number) => void,
    getSelectColorTramStatus: (status: string) => string,
    handleEntityLabelChange: (e: React.ChangeEvent<HTMLSelectElement>, index: number) => void,
    predictionIndex: number,
    text: string
  ): void;
  hideTooltip(): void;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  ranges,
  setRanges,
  predictions,
  getSelectTramStatusOptions,
  getSelectEntityLabelOptions,
  handleTramStatusChange,
  handleEntityLabelChange,
  getSelectColorTramStatus,
  handleRangeUpdate,
  handleDeleteHighlight,
}) => {
  const quillRef = useRef<Quill | null>(null);
  const quillContainerRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);

  const applyHighlights = useCallback(() => {
    if (quillRef.current) {
      quillRef.current.formatText(0, quillRef.current.getLength(), 'background', false);
      const bgColor = editMode ? '#5a189a' : '#2c7aba';
      ranges.forEach(([start, end]) => {
        quillRef.current?.formatText(start, end - start, 'background', bgColor);
        for (let i = start; i < end; i++) {
          const result = quillRef.current?.getLeaf(i);
          if (result) {
            const [leaf] = result;
            if (leaf && leaf.domNode) {
              if (leaf.domNode.nodeType === Node.TEXT_NODE && leaf.domNode.parentElement) {
                leaf.domNode.parentElement.classList.add('highlight-leaf');
              } else if (leaf.domNode instanceof HTMLElement) {
                leaf.domNode.classList.add('highlight-leaf');
              }
            }
          }
        }
      });
    }
  }, [editMode, ranges]);

  const initializeQuill = useCallback(() => {
    if (quillContainerRef.current && !quillRef.current) {
      quillRef.current = new Quill(quillContainerRef.current, {
        modules: {
          toolbar: false,
          customTooltipUnique: { editMode },
        },
        readOnly: true,
        theme: 'snow',
      });

      const editor = quillContainerRef.current.querySelector('.ql-editor');
      if (editor) {
        editor.classList.add('!h-auto', 'flex', 'flex-col');
      }

      applyHighlights();
    }
  }, [editMode, applyHighlights]);

  useEffect(() => {
    initializeQuill();
    return () => {
      if (quillRef.current) {
        quillRef.current.off('selection-change');
        quillRef.current = null;
      }
    };
  }, [initializeQuill]);

  useEffect(() => {
    if (quillRef.current && quillRef.current.getText().trim() !== text.trim()) {
      quillRef.current.setText(text);
      applyHighlights();
    }
  }, [text, applyHighlights]);

  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.setText(text);
      applyHighlights();
      const customTooltipModule = quillRef.current.getModule('customTooltipUnique') as CustomTooltipModuleType | undefined;
      customTooltipModule?.hideTooltip(); // Ensure tooltip module exists before calling hideTooltip
    }
  }, [text, ranges, editMode, applyHighlights]);

  useEffect(() => {
    if (quillRef.current) {
      const highlightLeaves = quillRef.current.root.querySelectorAll('.highlight-leaf');
      highlightLeaves.forEach((leaf) => {
        if (editMode) {
          leaf.classList.remove('pointer-cursor');
        } else {
          leaf.classList.add('pointer-cursor');
        }
      });
    }
  }, [ranges, editMode]);

  useEffect(() => {
    if (quillRef.current) {
      const selectionChangeHandler = (range: any) => {
        const customTooltipModule = quillRef.current?.getModule('customTooltipUnique') as CustomTooltipModuleType | undefined;
        if (range && range.length === 0 && !editMode) {
          const index = range.index;
          const clickedRange = ranges.find(([start, end]) => index >= start && index < end);
          if (clickedRange && customTooltipModule) {
            const predictionIndex = ranges.indexOf(clickedRange);
            const prediction = predictions[predictionIndex];
            const label = prediction.entity_label;
            const confidence = parseFloat((prediction.confidence * 100).toFixed(2));
            const tramStatus = prediction.tramStatus;
            const text = prediction.entity_text;
            customTooltipModule.showTooltip(
              {
                index: clickedRange[0],
                length: clickedRange[1] - clickedRange[0]
              }, 
              label, 
              confidence, 
              tramStatus, 
              getSelectTramStatusOptions, 
              getSelectEntityLabelOptions, 
              handleTramStatusChange, 
              getSelectColorTramStatus, 
              handleEntityLabelChange, 
              predictionIndex,
              text
            );
          }
        } else if (customTooltipModule) {
          customTooltipModule.hideTooltip();
        }
      };      
  
      quillRef.current.on('selection-change', selectionChangeHandler);
  
      return () => {
        quillRef.current?.off('selection-change', selectionChangeHandler);
      };
    }
  }, [editMode, ranges, predictions, getSelectTramStatusOptions, getSelectEntityLabelOptions, handleTramStatusChange, handleEntityLabelChange, getSelectColorTramStatus]);   

  const createHighlight = () => {
    if (quillRef.current) {
      const range = quillRef.current.getSelection();
      if (range && range.length > 0) {
        const newRange: [number, number] = [range.index, range.index + range.length];
        handleRangeUpdate(newRange, -1);
        setRanges((prevRanges) => [...prevRanges, newRange]);
      }
    }
  };

  const deleteHighlight = (clickedRange: [number, number]) => {
    setRanges((prevRanges) => prevRanges.filter(([start, end]) => start !== clickedRange[0] || end !== clickedRange[1]));
    handleDeleteHighlight(clickedRange);
  };

  const handleDeleteHighlightClick = () => {
    if (quillRef.current) {
      const range = quillRef.current.getSelection();
      if (range && range.length > 0) {
        const selectedRange: [number, number] = [range.index, range.index + range.length];
        const highlightToDelete = ranges.find(([start, end]) => selectedRange[0] >= start && selectedRange[1] <= end);
        if (highlightToDelete) {
          deleteHighlight(highlightToDelete);
        }
      }
    }
  };

  const toggleEditMode = useCallback(() => {
    setEditMode((prevEditMode) => {
      const newEditMode = !prevEditMode;
      if (quillRef.current) {
        const customTooltipModule = quillRef.current.getModule('customTooltipUnique') as CustomTooltipModuleType;
        customTooltipModule.hideTooltip();
      }
      return newEditMode;
    });
    applyHighlights();
  }, [applyHighlights]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center bg-gray-800 py-2 px-4">
        <span className="text-sm">Edit Entities</span>
        <div className="flex join ml-3">
          <ButtonIcon
            color={editMode ? 'btn-primary' : 'btn-primary'}
            buttonIcon={editMode ? 'edit_off' : 'edit'}
            label="Edit Entities"
            buttonSize="btn-sm"
            onClick={toggleEditMode}
            additionalClasses={`join-item ${editMode ? 'rounded-lg' : '!rounded-lg'}`}
          />
          <div className={`flex join-item join transition-opacity duration-500 ${editMode ? 'opacity-100' : 'opacity-0 hidden'}`}>
            <ButtonIcon
              color="btn-secondary"
              buttonIcon="add_circle"
              label="Create Highlight"
              buttonSize="btn-sm"
              onClick={createHighlight}
              additionalClasses="join-item rounded-l-none"
            />
            <ButtonIcon
              color="btn-secondary"
              buttonIcon="remove_circle"
              label="Delete Highlight"
              buttonSize="btn-sm"
              onClick={handleDeleteHighlightClick}
              additionalClasses="join-item rounded-r-lg"
            />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div ref={quillContainerRef} className="quill-container !h-full" />
      </div>
    </div>
  );
  };
  
  export default HighlightedText;
 
