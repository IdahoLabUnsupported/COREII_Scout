// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RootState } from '../../app/store';
import { createSelector } from '@reduxjs/toolkit';
import CardStatusNested from '../components/cards/CardStatusNested';
import Editor from '../components/elements/Editor';
import DOMPurify from 'dompurify';
import Quill from 'quill';
import { useGetReportCommentsQuery, useUpdateReportCommentsMutation } from '../../app/services/client';
import { AppReport } from '../../app/types/types';
import _debounce from 'lodash/debounce';

// Memoized selectors
const selectDerivedSourceId = (state: RootState) => state.sourceId.sourceId;
const selectLoading = (state: RootState) => state.sourceId.loading;

const Delta = Quill.import('delta');

type PaneReportTextProps = {
  reportSelected: AppReport;
  setIsDirty: (value: boolean) => void;
};

const PaneReportText: React.FC<PaneReportTextProps> = ({ reportSelected, setIsDirty }) => {
  const [editorContent, setEditorContent] = useState(new Delta().insert(""));
  const [statusMessage, setStatusMessage] = useState("");
  const quillRef = useRef<Quill | null>(null);
  const { data: commentsData } = useGetReportCommentsQuery(reportSelected.id);
  const [addReportVersion] = useUpdateReportCommentsMutation();

  useEffect(() => {
    if (commentsData && commentsData.comments) {
      try {
        const parsedComments = JSON.parse(commentsData.comments);
        if (parsedComments && parsedComments.ops) {
          setEditorContent(parsedComments);
        } else {
          setEditorContent(new Delta().insert(""));
        }
      } catch (error) {
        console.error('Failed to parse comments:', error);
        setEditorContent(new Delta().insert(""));
      }
    } else {
      setEditorContent(new Delta().insert(""));
    }
  }, [commentsData]);

  const initializeEditor = useCallback(() => {
    if (quillRef.current && editorContent) {
      const quill = quillRef.current;
      const currentRange = quill.getSelection();
      try {
        quill.setContents(editorContent);
        if (currentRange) {
          quill.setSelection(currentRange); 
        }
      } catch (error) {
        console.error('Failed to set editor content:', error);
      }
    }
  }, [editorContent]);

  useEffect(() => {
    initializeEditor();
  }, [initializeEditor, editorContent]);

  const saveComments = useCallback(() => {
    if (quillRef.current) {
      const quill = quillRef.current;
      const delta = quill.getContents();
      const sanitizedHtmlContent = DOMPurify.sanitize(quill.root.innerHTML);
      const sanitizedDelta = quill.clipboard.convert({ html: sanitizedHtmlContent });

      addReportVersion({
        id: reportSelected.id,
        comments: JSON.stringify(sanitizedDelta),
      }).then(() => {
        setStatusMessage("Saved!");
        setIsDirty(false);
        setTimeout(() => {
          setStatusMessage("");
        }, 1000);
      });
    }
  }, [addReportVersion, reportSelected.id, setIsDirty]);

  // lodash debounced version of the saveComments function
  const debouncedSaveComments = useCallback(_debounce(saveComments, 1000), [saveComments]);

  const handleTextChange = () => {
    setStatusMessage("Detected typing...");
    setIsDirty(true);
    debouncedSaveComments();
  };

  return (
    <div className="view-pane-component p-6 flex flex-col w-full h-full">
      <div className="flex-1 grid grid-cols-1 gap-4">
        <CardStatusNested title={'Analyst Comments'} type="normal" className="h-full">
          <div className="status-messages absolute top-5 right-5">
            {statusMessage && (
              <div className="status-message">
                {statusMessage}
              </div>
            )}
          </div>
          <Editor
            ref={quillRef}
            readOnly={false}
            defaultValue={editorContent}
            onTextChange={handleTextChange}
          />
        </CardStatusNested>
      </div>
    </div>
  );
};

export default PaneReportText;
