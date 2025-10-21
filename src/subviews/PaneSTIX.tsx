// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppReport } from '../../app/types/types.ts';
import CardContent from '../components/cards/CardContent.tsx';
import CardStatusNested from '../components/cards/CardStatusNested.tsx';
import { useSelector } from 'react-redux';
import { useGetBulkResultsQuery, useNewStixVersionMutation, useGetStixViewQuery } from '../../app/services/client.ts';
import { RootState } from '../../app/store/index.ts';
import ButtonBasic from '../components/elements/ButtonBasic';
import * as monaco from 'monaco-editor';
import { Editor, loader, useMonaco } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import FormElementSelect from '../components/forms/formElements/FormElementSelect';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

loader.config({ monaco });

loader.init().then(/* ... */);

type LayoutSTIXProps = {
  reportSelected: AppReport;
};

const PaneSTIX: React.FC<LayoutSTIXProps> = ({ reportSelected }) => {
  const currentDerivedSourceId = useSelector((state: RootState) => state.sourceId.sourceId);
  const { data: results, error } = useGetBulkResultsQuery(reportSelected.sourceList!, {
    //skip: !currentDerivedSourceId,
  });
  const { data: getStixViewResults, error: getStixViewError } = useGetStixViewQuery(reportSelected.id);

  const [addStixVersion] = useNewStixVersionMutation();
  const [allStix, setAllStix] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState('00'); // Define state for selected option
  const options = [
    { label: 'Full STIX', value: '00' },
    { label: 'Trimmed STIX', value: '01' },
  ];

  const isStixViewPopulated = (obj: any) => { 
    return obj !== null && obj !== undefined && 
          typeof obj === 'object' && 
          Object.keys(obj).length > 0;
  };

  useEffect(() => {
    if (isStixViewPopulated(getStixViewResults) && selectedOption === '00') {
      setAllStix(getStixViewResults);
    }
    else if (results && selectedOption === '01') {
      const newAllStix = results.map((item: any) => {
        if (item.stix && item.stix[item.currentStixVersionId] && item.stix[item.currentStixVersionId].data && item.stix[item.currentStixVersionId].data.objects) {
          return item.stix[item.currentStixVersionId].data.objects.map((obj: any) => {
            if (obj.entity && obj.value) {
              return { entity: obj.entity, value: obj.value };
            } else if (obj.type && obj.name) {
              return { type: obj.type, name: obj.name };
            }
            return obj; 
          });
        }
        return []; 
      });
      setAllStix(newAllStix);
    }
    else {
      setAllStix('[]');
    }
  }, [selectedOption, results, getStixViewResults]);

  const monaco = useMonaco();
  if (monaco) {
    monaco.editor.defineTheme('TestMonaco', {
      base: 'vs-dark',
      inherit: true,
      rules: [{
        background: '#111827',
        token: ''
      }], 
      colors: {
          'editor.background': '#111827',
      }
    });
    monaco.editor.setTheme('TestMonaco');
  }
  
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  function handleEditorWillMount(monaco: { languages: { typescript: { javascriptDefaults: { setEagerModelSync: (arg0: boolean) => void; }; }; }; }) {
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  }
  
  function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor | null, monaco: any) {
    editorRef.current = editor;
  }
  
  function showValue() {
    if (editorRef.current) {
      let editorValue = editorRef.current.getValue();
      alert(editorValue);
      const newStixObject = {
        id: results[0]?.stix[results[0].currentStixVersionId].data.id,
        type: results[0]?.stix[results[0].currentStixVersionId].data.type,
        objects: editorValue,
      }
      addStixVersion({resultId: currentDerivedSourceId, newStixVersion: newStixObject});
    }
  }

  function handleEditorChange(value: any, event: any) {
    console.log('here is the current model value:', value);
  }
  
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value); 
  };
  
  const location = useLocation();
  let thisLocation = location.pathname;

  if (error) return <div>Error On Data Retrieval.</div>
  
  return (
    <div className="view-pane-component p-6 flex flex-col w-full h-full">
      <CardStatusNested title={'Generated STIX'} type="normal" className="h-full">
        {thisLocation.includes('analysis') && (
          <div className="card-save-button-top">  
            <FormElementSelect
              label={'STIX Type'}
              labelClassName={'sr-only'}
              className={''}
              options={options}
              selectSize="select-sm"
              placeholder="STIX Type"
              value={selectedOption}
              onChange={handleSelectChange}
            />
          </div>
        )}
        <CardContent customClass="stix-card" customPadding='p-0'>
          {allStix && (
            <Editor
              className="monaco-editor-section"
              theme="vs-dark"
              height="100%" // Change this to 100% to allow it to fill the available space
              value={JSON.stringify(allStix, null, 2)}
              defaultLanguage="json"
              onChange={handleEditorChange}
              beforeMount={handleEditorWillMount}
              onMount={handleEditorDidMount}
            />
          )}
        </CardContent>
      </CardStatusNested>
    </div>
  );
};

export default React.memo(PaneSTIX, (prevProps, nextProps) => {
  return prevProps.reportSelected.STIXcode === nextProps.reportSelected.STIXcode;
});
