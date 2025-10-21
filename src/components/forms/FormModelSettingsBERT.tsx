import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import FormElementTextInput from './formElements/FormElementTextInput';
import FormElementSelect from './formElements/FormElementSelect';
import CardContent from '../cards/CardContent';
import CardStatusNested from '../cards/CardStatusNested';

type Props = {
  onClose?: () => void;
  showFormButtons?: boolean;
  data?: {
    id?: number;
    name?: string;
    uri?: string;
    description?: string;
    type?: string;
    status?: string;
    temperature?: string;
    topP?: string;
    frequencyPenalty?: string;
    presencePenalty?: string;
    maxTokens?: string;
  };
  onSaveData?: (data: any) => void;
};

export interface FormModelSettingsBERTHandles {
  saveEditedModel: () => Promise<boolean>;
  resetForm: () => void;
}

const FormModelSettingsBERT = forwardRef<FormModelSettingsBERTHandles, Props>(({ onClose, showFormButtons = false, data, onSaveData }, ref) => {
  const [modelName, setModelName] = useState<string>(data?.name || '');
  const [modelURI, setModelURI] = useState<string>(data?.uri || '');
  const [modelDescription, setModelDescription] = useState<string>(data?.description || '');
  const [modelType, setModelType] = useState<string>(data?.type || '');
  const [modelStatus, setModelStatus] = useState<string>(data?.status || '');
  const [temperature, setTemperature] = useState<string>(data?.temperature || '');
  const [topP, setTopP] = useState<string>(data?.topP || '');
  const [frequencyPenalty, setFrequencyPenalty] = useState<string>(data?.frequencyPenalty || '');
  const [presencePenalty, setPresencePenalty] = useState<string>(data?.presencePenalty || '');
  const [maxTokens, setMaxTokens] = useState<string>(data?.maxTokens || '');

  useEffect(() => {
    if (data) {
      setModelName(data.name || '');
      setModelURI(data.uri || '');
      setModelDescription(data.description || '');
      setModelType(data.type || ''); // Correctly set modelType
      setModelStatus(data.status || '');
      setTemperature(data.temperature || '');
      setTopP(data.topP || '');
      setFrequencyPenalty(data.frequencyPenalty || '');
      setPresencePenalty(data.presencePenalty || '');
      setMaxTokens(data.maxTokens || '');
    }
  }, [data]);

  const handleEditModel = async (): Promise<boolean> => {
    const clonedData = {
      id: data?.id || new Date().getTime(), // Assign a unique ID if not present
      name: modelName,
      uri: modelURI,
      description: modelDescription,
      type: modelType,
      status: modelStatus,
      temperature,
      topP,
      frequencyPenalty,
      presencePenalty,
      maxTokens,
    };

    if (onSaveData) onSaveData(clonedData);

    if (onClose) onClose();
    return true;
  };

  useImperativeHandle(ref, () => ({
    saveEditedModel: handleEditModel,
    resetForm: () => {
      setModelName('');
      setModelURI('');
      setModelDescription('');
      setModelType('');
      setModelStatus('');
      setTemperature('');
      setTopP('');
      setFrequencyPenalty('');
      setPresencePenalty('');
      setMaxTokens('');
    },
  }));

  const handleNumericInput = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]*(\.[0-9]?)?$/.test(value)) {
      setter(value);
    }
  };

  const handleWholeNumberInput = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]*$/.test(value)) {
      setter(value);
    }
  };

  const selectModelTypes = [
    { label: 'Supervised', value: 'Supervised' },
    { label: 'Unsupervised', value: 'Unsupervised' }
  ];

  return (
    <div className="w-full h-full flex flex-col mt-6">
      <div className="flex flex-1 overflow-y-auto flex-col gap-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        <CardStatusNested title={'Model Info'} type="normal">
          <CardContent customClass="!min-h-1">
            <div className="flex flex-row content-center pb-3 mb-3">
              <FormElementTextInput 
                label="Model Name" 
                value={modelName} 
                onChange={(e) => setModelName(e.target.value)} 
              />
            </div>
            <div className="flex flex-row content-center pb-3 mb-3">
              <FormElementTextInput 
                label="Model Description" 
                value={modelDescription} 
                onChange={(e) => setModelDescription(e.target.value)} 
              />
            </div>
            <div className="flex flex-row content-center">
              <span className="flex self-center">Model Type</span>
              <div className="w-40 ml-[50px]">
                <FormElementSelect
                  options={selectModelTypes}
                  label={'Model Type'}
                  labelClassName={'sr-only'}
                  selectSize=""
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </CardStatusNested>
        <CardStatusNested title={'Model URI'} type="normal">
          <CardContent customClass="!min-h-1">
            <FormElementTextInput 
              label="Model URI" 
              value={modelURI} 
              onChange={(e) => setModelURI(e.target.value)} 
            />
          </CardContent>
        </CardStatusNested>
        
        <CardStatusNested title={'Parameters'} type="normal">
          <CardContent customPadding="">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div className="flex flex-row content-center pb-3 mb-3">
                <FormElementTextInput 
                  type="number"
                  label="Temperature" 
                  value={temperature} 
                  onChange={handleNumericInput(setTemperature)} 
                  step="0.1"
                  instructionalTip="Number input (Range 0.0 - 1.0)"
                />
              </div>
              <div className="flex flex-row content-center pb-3 mb-3">
                <FormElementTextInput 
                  type="number"
                  label="Top-p" 
                  value={topP} 
                  onChange={handleNumericInput(setTopP)} 
                  step="0.1"
                  instructionalTip="Number input (Range 0.0 - 1.0)."
                />
              </div>
              <div className="flex flex-row content-center pb-3 mb-3">
                <FormElementTextInput 
                  type="number"
                  label="Frequency Penalty" 
                  value={frequencyPenalty} 
                  onChange={handleNumericInput(setFrequencyPenalty)} 
                  step="0.1"
                  instructionalTip="Number input (Range 0.0 - 2.0)."
                />
              </div>
              <div className="flex flex-row content-center pb-3 mb-3">
                <FormElementTextInput 
                  type="number"
                  label="Presence Penalty" 
                  value={presencePenalty} 
                  onChange={handleNumericInput(setPresencePenalty)} 
                  step="0.1"
                  instructionalTip="Number input (Range 0.0 - 2.0)"
                />
              </div>
              <div className="flex flex-row content-center mb-3">
                <FormElementTextInput 
                  type="number"
                  label="Max Tokens" 
                  value={maxTokens} 
                  onChange={handleWholeNumberInput(setMaxTokens)} 
                  instructionalTip="Max Tokens must be a whole number."
                />
              </div>
            </div>
          </CardContent>
        </CardStatusNested>
      </div>
      {showFormButtons && (
        <div className="flex justify-end mt-4">
          <button className="btn btn-primary mr-2" onClick={handleEditModel}>Save</button>
        </div>
      )}
    </div>
  );
});

export default FormModelSettingsBERT;
