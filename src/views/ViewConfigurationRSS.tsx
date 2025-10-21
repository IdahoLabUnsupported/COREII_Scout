// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useRef } from 'react';
import {
  useGetRSSFeedsQuery,
  useAddRSSFeedMutation,
  useUpdateRSSFeedMutation,
  useDeleteRSSFeedMutation,
  useImportRSSFeedsMutation,
  useExportRSSFeedsQuery,
  useDeleteRSSDataForDateMutation,
  useDeleteOldRSSDataMutation,
  useDeleteAllRSSDataMutation,
  useDeleteAllTopicModelsMutation,
  useGetSettingsQuery,
  useCreateOrUpdateSettingsMutation,
  useLazyExportRSSFeedsQuery
} from '../../app/services/client';
import { bertopicApi } from '../../app/services/bertopicApi';
import { useDispatch } from 'react-redux';
import { RSSFeedConfig } from '../../app/types/types';
import ButtonBasic from '../components/elements/ButtonBasic';
import CardContent from '../components/cards/CardContent';
import CardStatusNested from '../components/cards/CardStatusNested';
import FormElementTextInput from '../components/forms/formElements/FormElementTextInput';
import FormElementTextArea from '../components/forms/formElements/FormElementTextArea';
import FormElementDateInput from '../components/forms/formElements/FormElementDateInput';

const ViewConfigurationRSSNew: React.FC = () => {
  const dispatch = useDispatch();
  const { data: feedsData, isLoading, refetch } = useGetRSSFeedsQuery();
  const { data: settingsData } = useGetSettingsQuery('rssSettings');
  const [addFeed] = useAddRSSFeedMutation();
  const [updateFeed] = useUpdateRSSFeedMutation();
  const [deleteFeed] = useDeleteRSSFeedMutation();
  const [importFeeds] = useImportRSSFeedsMutation();
  const [deleteRSSData] = useDeleteRSSDataForDateMutation();
  const [deleteOldRSSData] = useDeleteOldRSSDataMutation();
  const [deleteAllRSSData] = useDeleteAllRSSDataMutation();
  const [deleteAllTopicModels] = useDeleteAllTopicModelsMutation();
  const [updateSettings] = useCreateOrUpdateSettingsMutation();
  
  const [triggerExport] = useLazyExportRSSFeedsQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFeed, setEditingFeed] = useState<RSSFeedConfig | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    rssUrl: '',
    description: '',
    tags: '',
  });

  // Data cleanup states
  const [deleteDate, setDeleteDate] = useState('');
  const [cutoffDate, setCutoffDate] = useState('');
  
  // BERTopic model configuration
  const [topicModelType, setTopicModelType] = useState<'simple' | 'complex'>('simple');

  // Sync state with settings data when it loads
  React.useEffect(() => {
    console.log('🔄 Settings data changed:', settingsData);
    console.log('🔄 Looking for bertopicModelType at root level:', settingsData?.bertopicModelType);
    if (settingsData?.bertopicModelType) {
      console.log('🔄 Setting topicModelType to:', settingsData.bertopicModelType);
      setTopicModelType(settingsData.bertopicModelType);
    } else {
      console.log('🔄 No bertopicModelType found, keeping default: simple');
    }
  }, [settingsData]);

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      rssUrl: '',
      description: '',
      tags: '',
    });
    setShowAddForm(false);
    setEditingFeed(null);
  };

  const handleAddFeed = async () => {
    try {
      await addFeed({
        title: formData.title,
        url: formData.url,
        rssUrl: formData.rssUrl,
        description: formData.description,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
      }).unwrap();
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error adding feed:', error);
    }
  };

  const handleUpdateFeed = async () => {
    if (!editingFeed) return;
    
    try {
      await updateFeed({
        id: editingFeed.id,
        title: formData.title,
        url: formData.url,
        rssUrl: formData.rssUrl,
        description: formData.description,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
      }).unwrap();
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error updating feed:', error);
    }
  };

  const handleEditFeed = (feed: RSSFeedConfig) => {
    setFormData({
      title: feed.title,
      url: feed.url || '',
      rssUrl: feed.rssUrl,
      description: feed.description || '',
      tags: feed.tags?.join(', ') || '',
    });
    setEditingFeed(feed);
    setShowAddForm(true);
  };

  const handleDeleteFeed = async (id: string) => {
    if (confirm('Are you sure you want to delete this RSS feed?')) {
      try {
        await deleteFeed(id).unwrap();
        refetch();
      } catch (error) {
        console.error('Error deleting feed:', error);
      }
    }
  };

  const handleToggleHidden = async (feed: RSSFeedConfig) => {
    try {
      await updateFeed({
        id: feed.id,
        hidden: !feed.hidden,
      }).unwrap();
      refetch();
    } catch (error) {
      console.error('Error toggling feed visibility:', error);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          
          await importFeeds({
            csvContent: content,
            replace: false
          }).unwrap();
          
          refetch();
          alert('Feeds imported successfully!');
        } catch (error) {
          console.error('Error importing feeds:', error);
          alert('Error importing feeds. Please check the CSV file format.');
        }
      };
      reader.readAsText(file);
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleExport = async () => {
    try {
      const result = await triggerExport().unwrap();
      
      const blob = new Blob([result], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rss_feeds.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting RSS feeds:', error);
      alert('Error exporting RSS feeds. Please try again.');
    }
  };

  const handleDeleteSpecificDate = async () => {
    if (!deleteDate) return;
    
    if (confirm(`Are you sure you want to delete RSS data for ${deleteDate}?`)) {
      try {
        await deleteRSSData(deleteDate).unwrap();
        alert(`RSS data for ${deleteDate} deleted successfully`);
        setDeleteDate('');
      } catch (error) {
        console.error('Error deleting RSS data:', error);
        alert('Error deleting RSS data');
      }
    }
  };

  const handleDeleteOldData = async () => {
    if (!cutoffDate) return;
    
    if (confirm(`Are you sure you want to delete all RSS data older than ${cutoffDate}?`)) {
      try {
        const result = await deleteOldRSSData(cutoffDate).unwrap();
        alert(`Deleted ${result.deletedCount} RSS data files older than ${cutoffDate}`);
        setCutoffDate('');
      } catch (error) {
        console.error('Error deleting old RSS data:', error);
        alert('Error deleting old RSS data');
      }
    }
  };

  const handleDeleteAllData = async () => {
    if (confirm('⚠️ WARNING: This will permanently delete ALL RSS data from the database and filesystem. This action cannot be undone. Are you sure you want to continue?')) {
      try {
        const result = await deleteAllRSSData().unwrap();
        alert(`All RSS data deleted successfully. Removed ${result.deletedArticles} articles and ${result.deletedFiles} files.`);
      } catch (error) {
        console.error('Error deleting all RSS data:', error);
        alert('Error deleting all RSS data');
      }
    }
  };

  const handleDeleteAllTopicModels = async () => {
    if (confirm('⚠️ WARNING: This will permanently delete ALL Topic Models from the BERTopic service. This action cannot be undone. Are you sure you want to continue?')) {
      try {
        const result = await deleteAllTopicModels().unwrap();
        
        // Invalidate BERTopic cache to update Emerging Topics UI
        dispatch(bertopicApi.util.invalidateTags(['BertopicModel', 'BertopicData']));
        
        alert(`All topic models deleted successfully. Removed ${result.deleted_count} models: ${result.deleted_models.join(', ')}`);
      } catch (error) {
        console.error('Error deleting all topic models:', error);
        alert('Error deleting all topic models');
      }
    }
  };

  const handleTopicModelTypeChange = async (newType: 'simple' | 'complex') => {
    console.log('🔧 Topic model type changing to:', newType);
    console.log('📄 Current settings data:', settingsData);
    
    setTopicModelType(newType);
    
    try {
      const updatePayload = {
        ...settingsData,
        bertopicModelType: newType
      };
      console.log('📤 Sending settings update:', updatePayload);
      console.log('📤 Specifically setting bertopicModelType to:', updatePayload.bertopicModelType);
      
      const result = await updateSettings(updatePayload).unwrap();
      console.log('✅ Settings update successful:', result);
      console.log('✅ Returned bertopicModelType:', result.bertopicModelType);
    } catch (error) {
      console.error('❌ Error updating topic model type setting:', error);
    }
  };

  const feeds = feedsData?.feeds || [];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-4 text-lg">Loading RSS configuration...</span>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col w-full gap-4">
      {/* RSS Feeds Management */}
      <CardStatusNested title="RSS Feed Sources" type="normal">
        <div className="absolute right-1 top-3 flex space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileImport}
            className="hidden"
          />
          <ButtonBasic
            label="Import"
            color="btn-secondary"
            buttonSize="btn-sm"
            onClick={handleImport}
          />
          <ButtonBasic
            label="Export"
            color="btn-secondary"
            buttonSize="btn-sm"
            onClick={handleExport}
          />
          <ButtonBasic
            label={showAddForm ? "Cancel" : "Add Feed"}
            color={showAddForm ? "btn-ghost" : "btn-primary"}
            buttonSize="btn-sm"
            onClick={() => showAddForm ? resetForm() : setShowAddForm(true)}
          />
        </div>
        
        <CardContent customPadding="p-4">
          {/* Add/Edit Feed Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-base-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">
                {editingFeed ? 'Edit RSS Feed' : 'Add New RSS Feed'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormElementTextInput
                  label="Feed Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., The Hacker News"
                />
                
                <FormElementTextInput
                  label="RSS URL"
                  value={formData.rssUrl}
                  onChange={(e) => setFormData({ ...formData, rssUrl: e.target.value })}
                  placeholder="e.g., https://example.com/feed/"
                />
                
                <FormElementTextInput
                  label="Website URL"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="e.g., https://example.com"
                />
                
                <FormElementTextInput
                  label="Tags (comma-separated)"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., cybersecurity, news, technology"
                />
              </div>
              
              <div className="mt-4">
                <FormElementTextArea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the RSS feed"
                />
              </div>
              
              <div className="flex space-x-3 mt-4">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={editingFeed ? handleUpdateFeed : handleAddFeed}
                  disabled={!formData.title || !formData.rssUrl}
                >
                  {editingFeed ? "Update Feed" : "Add Feed"}
                </button>
                <ButtonBasic
                  label="Cancel"
                  color="btn-ghost"
                  onClick={resetForm}
                />
              </div>
            </div>
          )}

          {/* Feeds List */}
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full bg-white dark:bg-gray-800">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Feed</th>
                  <th>RSS URL</th>
                  <th>Articles</th>
                  <th>Tags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map((feed) => (
                  <tr key={feed.id} className={feed.hidden ? 'opacity-50' : ''}>
                    <td>
                      <div className={`badge ${feed.hidden ? 'badge-ghost' : 'badge-success'} badge-sm`}>
                        {feed.hidden ? 'Hidden' : 'Active'}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="font-semibold">{feed.title}</div>
                        {feed.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {feed.description}
                          </div>
                        )}
                        {feed.url && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            <a href={feed.url} target="_blank" rel="noopener noreferrer" className="link">
                              {feed.url}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate max-w-xs">
                        {feed.rssUrl}
                      </div>
                    </td>
                    <td>
                      <div className="badge badge-outline badge-sm">
                        {feed.articleCount || 0}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {feed.tags?.slice(0, 3).map((tag, index) => (
                          <div key={index} className="badge badge-ghost badge-xs">
                            {tag}
                          </div>
                        ))}
                        {feed.tags && feed.tags.length > 3 && (
                          <div className="badge badge-ghost badge-xs">
                            +{feed.tags.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex space-x-1">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleEditFeed(feed)}
                          title="Edit feed"
                        >
                          <i className="material-icons text-sm">edit</i>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleHidden(feed)}
                          title={feed.hidden ? "Show feed" : "Hide feed"}
                        >
                          <i className="material-icons text-sm">
                            {feed.hidden ? 'visibility' : 'visibility_off'}
                          </i>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteFeed(feed.id)}
                          title="Delete feed"
                        >
                          <i className="material-icons text-sm text-error">delete</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {feeds.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No RSS feeds configured. Add your first feed to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </CardStatusNested>

      {/* BERTopic Configuration */}
      <CardStatusNested title="BERTopic Model Configuration" type="normal">
        <CardContent customPadding="p-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-md font-semibold mb-3">Topic Model Type</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose the type of BERTopic model to use when creating topic models from RSS articles.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    topicModelType === 'simple' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-gray-300 hover:border-primary/50'
                  }`}
                  onClick={() => handleTopicModelTypeChange('simple')}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="topicModelType"
                      value="simple"
                      checked={topicModelType === 'simple'}
                      onChange={() => handleTopicModelTypeChange('simple')}
                      className="radio radio-primary mt-1"
                    />
                    <div>
                      <h5 className="font-medium text-primary">Simple Model</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Fast training with default parameters. Best for quick topic discovery and smaller datasets.
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        • Faster processing<br/>
                        • Single model generation<br/>
                        • Good for exploratory analysis
                      </div>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    topicModelType === 'complex' 
                      ? 'border-primary bg-primary/10' 
                      : 'border-gray-300 hover:border-primary/50'
                  }`}
                  onClick={() => handleTopicModelTypeChange('complex')}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="topicModelType"
                      value="complex"
                      checked={topicModelType === 'complex'}
                      onChange={() => handleTopicModelTypeChange('complex')}
                      className="radio radio-primary mt-1"
                    />
                    <div>
                      <h5 className="font-medium text-primary">Complex Model</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Hyperparameter optimization for best model quality. Recommended for production use.
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        • Slower but higher quality<br/>
                        • Automatic parameter tuning<br/>
                        • Best model selection
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </CardStatusNested>

      {/* Data Management */}
      <CardStatusNested title="Data Management" type="normal">
        <CardContent customPadding="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6">
            {/* Delete specific date */}
            <div className="space-y-3 min-w-0">
              <h4 className="text-md font-semibold">Delete Data for Specific Date</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remove all RSS articles collected on a specific date.
              </p>
              <div className="space-y-2 flex flex-col items-center">
                <div className="w-full max-w-xs">
                  <input
                    type="date"
                    value={deleteDate}
                    onChange={(e) => setDeleteDate(e.target.value)}
                    className="input input-bordered input-secondary w-full bg-gray-300 border-gray-400 dark:bg-gray-900 dark:border-gray-400 text-sm"
                  />
                </div>
                <button
                  className="btn btn-error btn-sm w-full max-w-xs"
                  onClick={handleDeleteSpecificDate}
                  disabled={!deleteDate}
                >
                  Delete Date
                </button>
              </div>
            </div>

            {/* Delete old data */}
            <div className="space-y-3 min-w-0">
              <h4 className="text-md font-semibold">Delete Old Data</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remove all RSS articles collected before a specific date.
              </p>
              <div className="space-y-2 flex flex-col items-center">
                <div className="w-full max-w-xs">
                  <input
                    type="date"
                    value={cutoffDate}
                    onChange={(e) => setCutoffDate(e.target.value)}
                    className="input input-bordered input-secondary w-full bg-gray-300 border-gray-400 dark:bg-gray-900 dark:border-gray-400 text-sm"
                  />
                </div>
                <button
                  className="btn btn-error btn-sm w-full max-w-xs"
                  onClick={handleDeleteOldData}
                  disabled={!cutoffDate}
                >
                  Delete Older
                </button>
              </div>
            </div>

            {/* Delete all data */}
            <div className="space-y-3 min-w-0">
              <h4 className="text-md font-semibold text-error">Delete All RSS Data</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Permanently remove ALL RSS articles from database and files.
              </p>
              <button
                className="btn btn-error btn-sm w-full"
                onClick={handleDeleteAllData}
              >
                <i className="material-icons text-sm mr-1">delete_forever</i>
                Delete All Data
              </button>
              <p className="text-xs text-error">
                ⚠️ This action cannot be undone!
              </p>
            </div>

            {/* Delete all topic models */}
            <div className="space-y-3 min-w-0">
              <h4 className="text-md font-semibold text-error">Delete All Topic Models</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Permanently remove ALL BERTopic models from the system.
              </p>
              <button
                className="btn btn-error btn-sm w-full"
                onClick={handleDeleteAllTopicModels}
              >
                <i className="material-icons text-sm mr-1">model_training</i>
                Delete All Models
              </button>
              <p className="text-xs text-error">
                ⚠️ This action cannot be undone!
              </p>
            </div>
          </div>
        </CardContent>
      </CardStatusNested>
    </div>
  );
};

export default ViewConfigurationRSSNew;