// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useRef, useEffect } from 'react';
import CardStatusNested from '../components/cards/CardStatusNested';
import CardContent from '../components/cards/CardContent';
import DialogCreateModelLLM from '../components/dialogs/DialogCreateModelLLM';
import DialogCreateModelBERT from '../components/dialogs/DialogCreateModelBERT';
import TableModelsLLM from '../components/elements/tables/TableModelsLLM';
import TableModelsBERT from '../components/elements/tables/TableModelsBERT';
import { LLMModel, BERTModel } from '../../app/types/types';
import { useCreateOrUpdateSettingsMutation, useGetSettingsQuery } from '../../app/services/client';

const ViewConfigurationModels: React.FC = () => {

  const { data: settings, isLoading, isSuccess, isError, refetch } = useGetSettingsQuery('default_settings');
  const [saveSettings] = useCreateOrUpdateSettingsMutation();

  const [llmModels, setLlmModels] = useState<LLMModel[]>([
    /*
    { id: 1, name: 'Model A', description: 'Description for Model A', status: 'Online', type: 'llm', uri: 'localhost:7777', active: true },
    { id: 2, name: 'Model B', description: 'Description for Model B', status: 'Online', type: 'llm', uri: 'localhost:7777', active: true },
    { id: 3, name: 'Model C', description: 'Description for Model C', status: 'Offline', type: 'llm', uri: 'localhost:7777', active: true },
    { id: 4, name: 'Model D', description: 'Description for Model D', status: 'Maintenance', type: 'llm', uri: 'localhost:7777', active: true },
     */
  ]);

  const [bertModels, setBertModels] = useState<BERTModel[]>([
    /*
    { id: 1, name: 'BERTopic Model A', description: 'Descriptison for BERT Model A', status: 'Online', type: 'Supervised', uri: 'localhost:8888', active: true },
    { id: 2, name: 'BERTopic Model B', description: 'Description for BERT Model B', status: 'Online', type: 'Unsupervised', uri: 'localhost:8888', active: true },
     */
  ]);

  useEffect(() => {
    if (!isLoading) {
      if (isError || !settings) {
        // Handle the error or initialize with default values if necessary
        setLlmModels([]); // You can set initial values here if needed
        setBertModels([]);
      } else if (isSuccess && settings.models) {
        const llmModels = settings.models.filter((model: LLMModel) => !(model.type?.toLowerCase() ?? '').includes('supervised')); 
        const bertModels = settings.models.filter((model: BERTModel) => model.type.toLowerCase().includes('supervised')); 
        setLlmModels(llmModels);
        setBertModels(bertModels);
      }
    }
  }, [isLoading, isSuccess, isError, settings]);

  const [selectedLlmModelId, setSelectedLlmModelId] = useState<number | null>(null);
  const [selectedBertModelId, setSelectedBertModelId] = useState<number | null>(null);

  const handleSaveModel = async (newModel: any) => {
    let updatedLlmModels = llmModels;

    updatedLlmModels = llmModels.some(model => model.id === newModel.id)
      ? llmModels.map(model => (model.id === newModel.id ? newModel : model))
      : [...llmModels, newModel];
    setLlmModels(updatedLlmModels);

    const updatedSettings = {
      ...settings,
      models: [
        ...settings.models.filter((model: any) => model.id !== newModel.id),
        newModel 
      ]
    };

    try {
      await saveSettings(updatedSettings);
      console.log("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings", error);
    }
  };

  const handleSaveBertModel = async (newModel: any) => {
    let updatedBertModels = bertModels;

    if (!newModel.type)
      newModel.type = 'Unsupervised';

    updatedBertModels = bertModels.some(model => model.id === newModel.id)
      ? bertModels.map(model => (model.id === newModel.id ? newModel : model))
      : [...bertModels, newModel];
    setBertModels(updatedBertModels);

    const updatedSettings = {
      ...settings,
      models: [
        ...settings.models.filter((model: any) => model.id !== newModel.id),
        newModel 
      ]
    };

    try {
      await saveSettings(updatedSettings);
      console.log("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings", error);
    }
  };

  const handleDeleteBertModel = (modelId: number) => {
    setBertModels((prevModels) => prevModels.filter((model) => model.id !== modelId));
  };

  const handleDeleteLlmModel = (modelId: number) => {
    setLlmModels((prevModels) => prevModels.filter((model) => model.id !== modelId));
  };

  if (isLoading) return (<h3>Loading...</h3>)
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        <CardStatusNested title={'LLM Models'} type="normal">
          <div className="flex flex-row justify-between mb-3">
            <span>These LLM models are used for natural language processing tasks within the app. Please add and configure models to enable these features.</span>
            <div>
              <DialogCreateModelLLM
                title="Add New Model"
                buttonType="text"
                buttonColor="btn-primary"
                buttonLabel="Add Model"
                buttonSize="btn-sm"
                onSave={handleSaveModel}
              />
            </div>
          </div>
          
          <CardContent customPadding="p-0">
            {llmModels.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">No models available. Please add a model to enable app features.</p>
              </div>
            ) : (
              <TableModelsLLM
                models={llmModels}
                selectedModelId={selectedLlmModelId}
                onModelSelect={setSelectedLlmModelId}
                onSaveModel={handleSaveModel}
                onDeleteModel={handleDeleteLlmModel}
              />
            )}
          </CardContent>
        </CardStatusNested>

        <CardStatusNested title={'BERTopic Models'} type="normal">
          <div className="flex flex-row justify-between mb-3">
            <span>These BERTopic models are used for topic modeling and analysis in the app. Add and configure models to enable topic-based functionalities.</span>
            <div>
              <DialogCreateModelBERT
                title="Add New Model"
                buttonType="text"
                buttonColor="btn-primary"
                buttonLabel="Add Model"
                buttonSize="btn-sm"
                onSave={handleSaveBertModel}
              />
            </div>
          </div>
          
          <CardContent customPadding="p-0">
            {bertModels.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">No models available. Please add a model to enable app features.</p>
              </div>
            ) : (
              <TableModelsBERT
                models={bertModels}
                selectedModelId={selectedBertModelId}
                onModelSelect={setSelectedBertModelId}
                onSaveModel={handleSaveBertModel}
                onDeleteModel={handleDeleteBertModel}
              />
            )}
          </CardContent>
        </CardStatusNested>
      </div>
    </div>
  );
};

export default ViewConfigurationModels;
