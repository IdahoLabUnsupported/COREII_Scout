// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import CardStatusNested from '../components/cards/CardStatusNested';
import CardContent from '../components/cards/CardContent';
import {
  useGetAvailableModelsQuery,
  useGetCurrentModelQuery,
  useSwitchModelMutation,
  useDeleteModelMutation,
  useClearModelMutation
} from '../../app/services/bertopicApi';

const ViewModelSelector: React.FC = () => {
  // Model Management API queries
  const { data: availableModels, isLoading: modelsLoading, error: modelsError } = useGetAvailableModelsQuery();
  const { data: currentModel, error: currentModelError } = useGetCurrentModelQuery();
  const [switchModel, { isLoading: switchingModel }] = useSwitchModelMutation();
  const [deleteModel, { isLoading: deletingModel }] = useDeleteModelMutation();
  const [clearModel, { isLoading: clearingModel }] = useClearModelMutation();

  // Handle model switching
  const handleModelSwitch = async (modelName: string) => {
    try {
      await switchModel({ modelName }).unwrap();
    } catch (error) {
      console.error('Failed to switch model:', error);
      alert('Failed to switch model. Please try again.');
    }
  };

  // Handle model deletion
  const handleModelDelete = async (modelName: string) => {
    if (confirm(`Are you sure you want to delete the model "${modelName}"? This action cannot be undone.`)) {
      try {
        const result = await deleteModel({ modelName }).unwrap();
        if (result.unloaded_current) {
          alert(`Model "${modelName}" was deleted. No model is currently loaded. Please select another model to view topic data.`);
        }
      } catch (error) {
        console.error('Failed to delete model:', error);
        alert('Failed to delete model. Please try again.');
      }
    }
  };

  // Handle clearing current model
  const handleClearModel = async () => {
    if (confirm('Are you sure you want to unload the current model? You will need to select another model to view topic data.')) {
      try {
        await clearModel().unwrap();
      } catch (error) {
        console.error('Failed to clear model:', error);
        alert('Failed to clear model. Please try again.');
      }
    }
  };

  if (modelsError) {
    return (
      <div className="space-y-6">
        <div className="alert alert-error">
          <span>Error loading model list. Please ensure the BERTopic service is running.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Topic Model Management</h1>
      
      {/* Current Model Info */}
      <CardStatusNested title="Current Model" type="normal">
        <CardContent customPadding="p-4">
          <div className="bg-base-200 rounded-lg p-4">
            {currentModel?.loaded ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-lg font-medium text-success">✓ Model Loaded</div>
                    <div className="text-sm opacity-70">{currentModel.current_model}</div>
                  </div>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={handleClearModel}
                    disabled={clearingModel}
                    title="Unload current model"
                  >
                    {clearingModel ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      'Unload Model'
                    )}
                  </button>
                </div>
                
                {availableModels?.models.find(m => m.name === currentModel.current_model) && (() => {
                  const model = availableModels.models.find(m => m.name === currentModel.current_model);
                  return (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Topics:</span> {model?.num_topics || 'N/A'}</div>
                      <div><span className="font-medium">Documents:</span> {model?.total_documents || 'N/A'}</div>
                      {model?.training_config && (
                        <>
                          <div className="col-span-2">
                            <span className="font-medium">Date Range:</span> {model.training_config.start_date} to {model.training_config.end_date} ({model.training_config.date_range_days} days)
                          </div>
                        </>
                      )}
                      {model?.creation_source && (
                        <div><span className="font-medium">Source:</span> {model.creation_source}</div>
                      )}
                      {model?.created_at && (
                        <div><span className="font-medium">Created:</span> {new Date(model.created_at).toLocaleString()}</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-lg font-medium text-warning">⚠ No Model Loaded</div>
                <div className="text-sm opacity-70 mt-1">Select a model below to load it</div>
              </div>
            )}
          </div>
        </CardContent>
      </CardStatusNested>

      {/* Available Models */}
      <CardStatusNested title="Available Models" type="normal">
        <CardContent customPadding="p-4">
          {modelsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading loading-spinner loading-lg"></div>
              <span className="ml-4">Loading models...</span>
            </div>
          ) : availableModels && availableModels.models.length > 0 ? (
            <div className="space-y-4">
              {availableModels.models.map((model) => (
                <div key={model.name} className="card bg-base-100 border border-base-300">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{model.name}</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                          <div><span className="font-medium">Topics:</span> {model.num_topics || 'N/A'}</div>
                          <div><span className="font-medium">Documents:</span> {model.total_documents || 'N/A'}</div>
                          {model.training_config && (
                            <>
                              <div className="col-span-2">
                                <span className="font-medium">Date Range:</span> {model.training_config.start_date} to {model.training_config.end_date} ({model.training_config.date_range_days} days)
                              </div>
                            </>
                          )}
                          {model.creation_source && (
                            <div><span className="font-medium">Source:</span> {model.creation_source}</div>
                          )}
                          {model.created_at && (
                            <div><span className="font-medium">Created:</span> {new Date(model.created_at).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          className={`btn btn-sm ${model.is_current ? 'btn-success' : 'btn-primary'}`}
                          onClick={() => handleModelSwitch(model.name)}
                          disabled={switchingModel || model.is_current}
                        >
                          {switchingModel ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : model.is_current ? (
                            'Current'
                          ) : (
                            'Load'
                          )}
                        </button>
                        
                        <button
                          className="btn btn-error btn-outline btn-sm"
                          onClick={() => handleModelDelete(model.name)}
                          disabled={deletingModel}
                          title="Delete model permanently"
                        >
                          {deletingModel ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            '🗑️'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-lg font-medium text-warning">No Models Available</div>
              <div className="text-sm opacity-70 mt-1">Train a model using the RSS Feeds page first</div>
            </div>
          )}
          
          {switchingModel && (
            <div className="mt-4 flex items-center justify-center">
              <div className="loading loading-spinner loading-sm"></div>
              <span className="ml-2 text-sm">Switching model...</span>
            </div>
          )}
        </CardContent>
      </CardStatusNested>
      
      {/* Help Text */}
      <div className="alert alert-info">
        <span className="text-sm">
          💡 <strong>Tip:</strong> You can delete any model, including the currently loaded one. 
          If you delete the current model, you'll need to select another model to view topic data.
        </span>
      </div>
    </div>
  );
};

export default ViewModelSelector;