// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetRSSArticlesQuery, 
  useCollectRSSArticlesMutation, 
  useCollectDailyRSSMutation,
  useGetRSSStatsQuery,
  useGetRSSQueueStatusQuery,
  useGetSettingsQuery
} from '../../app/services/client';
import {
  useTrainBertopicModelMutation,
  useGetBertopicTrainingStatusQuery,
  useLazyGetBertopicTrainingStatusQuery,
  bertopicApi
} from '../../app/services/bertopicApi';
import { useAppDispatch } from '../../app/hooks/reduxTypescriptHooks';
import { RSSArticle, RSSCollectionJob } from '../../app/types/types';
import ButtonBasic from '../components/elements/ButtonBasic';
import DialogAddRssSource from '../components/dialogs/DialogAddRssSource';

const LayoutRSS: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7); // Default to last 7 days
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 50;

  // API calls
  const { data: articlesData, isLoading, error, refetch } = useGetRSSArticlesQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: articlesPerPage,
    offset: (currentPage - 1) * articlesPerPage
  });

  const { data: statsData } = useGetRSSStatsQuery();
  const { data: settingsData } = useGetSettingsQuery('rssSettings');
  const { data: queueStatus, refetch: refetchQueueStatus } = useGetRSSQueueStatusQuery(undefined, {
    pollingInterval: 2000 // Poll every 2 seconds for real-time updates
  });
  const [collectArticles] = useCollectRSSArticlesMutation();
  const [collectDaily] = useCollectDailyRSSMutation();
  
  // BERTopic training
  const [trainBertopicModel, { isLoading: isTrainingLoading }] = useTrainBertopicModelMutation();
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [wasCollecting, setWasCollecting] = useState(false);
  const [lastCompletedTraining, setLastCompletedTraining] = useState<any>(null);
  const { data: trainingStatus, error: trainingStatusError } = useGetBertopicTrainingStatusQuery(undefined, {
    pollingInterval: (isTrainingLoading || isTrainingActive) ? 500 : 0, // Poll every 500ms during training for faster updates
    skip: !(isTrainingLoading || isTrainingActive) // Only skip when not training or loading
  });
  const [checkTrainingStatus] = useLazyGetBertopicTrainingStatusQuery();

  // Check for training in progress when component mounts
  useEffect(() => {
    const checkInitialTrainingStatus = async () => {
      console.log('🔍 Checking for training in progress on page load...');
      try {
        const result = await checkTrainingStatus();
        if (result.data && result.data.status === 'running') {
          console.log('🔄 Found training in progress on page load, activating polling');
          setIsTrainingActive(true);
        } else {
          console.log('✅ No training in progress on page load');
        }
      } catch (error) {
        console.error('❌ Error checking initial training status:', error);
      }
    };
    
    checkInitialTrainingStatus();
  }, []); // Run only once on mount

  // Monitor training status and stop polling when complete
  useEffect(() => {
    console.log('🎯 Training status update at', new Date().toISOString(), ':', trainingStatus);
    console.log('🔄 Current polling state - isTrainingLoading:', isTrainingLoading, 'isTrainingActive:', isTrainingActive);
    
    if (trainingStatus) {
      // Use end_time for completed/failed statuses, start_time for active statuses
      const relevantTime = (trainingStatus.status === 'completed' || trainingStatus.status === 'failed') 
        ? trainingStatus.end_time || trainingStatus.start_time
        : trainingStatus.start_time;
      const statusTime = new Date(relevantTime || '').getTime();
      const now = Date.now();
      const isRecentStatus = (now - statusTime) < 15000; // Status from last 15 seconds only (stricter)
      
      console.log('📅 Status timestamp check - relevantTime:', relevantTime, 'isRecent:', isRecentStatus, 'ageSeconds:', Math.round((now - statusTime) / 1000));
      
      // Only stop polling for very recent completed/failed status (not stale cache)
      if ((trainingStatus.status === 'completed' || trainingStatus.status === 'failed') && isRecentStatus && isTrainingActive) {
        console.log('✅ Training finished (very recent), stopping polling');
        
        // Save completed training status before cache invalidation
        if (trainingStatus.status === 'completed') {
          setLastCompletedTraining({...trainingStatus, timestamp: Date.now()});
        }
        
        setIsTrainingActive(false);
        
        // Manually invalidate BERTopic cache to refresh models list and topic data
        console.log('🔄 Manually invalidating BERTopic cache...');
        dispatch(bertopicApi.util.invalidateTags(['BertopicModel', 'BertopicData']));
        
        // Force a fresh refetch of models list with a delay to ensure new model is ready
        setTimeout(() => {
          console.log('🔄 Force refetching models list after training completion...');
          dispatch(bertopicApi.util.invalidateTags(['BertopicModel']));
        }, 2000);
        
        // Force another invalidation of topic data after a longer delay for emerging topics view
        setTimeout(() => {
          console.log('🔄 Final invalidation of topic data for emerging topics...');
          dispatch(bertopicApi.util.invalidateTags(['BertopicData']));
        }, 3000);
      } else if (trainingStatus.status === 'running' && !isTrainingActive) {
        console.log('🔄 Training detected as running but polling not active, activating polling');
        setIsTrainingActive(true);
      } else if ((trainingStatus.status === 'completed' || trainingStatus.status === 'failed') && (!isRecentStatus || !isTrainingActive)) {
        console.log('⚠️ Ignoring stale/inactive completed status from:', trainingStatus.start_time, 'age:', Math.round((now - statusTime) / 1000), 'seconds');
      }
    }
  }, [trainingStatus, isTrainingLoading, isTrainingActive]);

  // Monitor RSS collection jobs and refresh articles when complete
  useEffect(() => {
    if (queueStatus) {
      const isCurrentlyCollecting = queueStatus.isProcessing;
      
      // If we were collecting and now we're not, refresh the articles
      if (wasCollecting && !isCurrentlyCollecting) {
        console.log('📰 RSS collection completed, refreshing articles...');
        refetch();
      }
      
      setWasCollecting(isCurrentlyCollecting);
    }
  }, [queueStatus, wasCollecting, refetch]);

  const handleCollectMissing = async () => {
    try {
      await collectArticles({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        recollect: false
      }).unwrap();
    } catch (error) {
      console.error('Error collecting articles:', error);
    }
  };

  const handleDailyCollection = async () => {
    try {
      await collectDaily().unwrap();
    } catch (error) {
      console.error('Error with daily collection:', error);
    }
  };

  const handleCreateTopicModel = async () => {
    try {
      console.log('🚀 Button clicked for topic model training at:', new Date().toISOString());
      
      // Check if training is already running via current state or fresh check
      if (trainingStatus && trainingStatus.status === 'running') {
        console.log('⚡ Training already running (from state), just showing progress bar');
        setIsTrainingActive(true);
        return;
      }
      
      // If we don't have fresh status data, check server
      console.log('🔍 Checking current training status on server...');
      const currentStatus = await checkTrainingStatus();
      console.log('📊 Fresh status from server:', currentStatus);
      
      if (currentStatus.data && currentStatus.data.status === 'running') {
        console.log('⚡ Training already running (from server), just showing progress bar');
        setIsTrainingActive(true);
        return;
      }
      
      // Set training active immediately to start polling  
      console.log('🔄 No training running, starting new training and setting isTrainingActive to true');
      setIsTrainingActive(true);
      
      // Clear any previous completed training status
      setLastCompletedTraining(null);
      
      console.log('📤 Sending training request...');
      console.log('🔍 Full settingsData:', settingsData);
      console.log('🔍 settingsData?.bertopicModelType:', settingsData?.bertopicModelType);
      const modelType = settingsData?.bertopicModelType || 'simple';
      console.log('🔧 Using model type:', modelType);
      console.log('🔧 Model type source:', settingsData?.bertopicModelType ? 'from settings' : 'default fallback');
      
      const result = await trainBertopicModel({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        recollect: false,
        modelType: modelType
      }).unwrap();
      
      // Force a fresh status check immediately after starting training
      console.log('🔄 Training started, forcing fresh status check...');
      setTimeout(() => {
        checkTrainingStatus();
      }, 100);
      
      console.log('✅ Topic model training request sent successfully at:', new Date().toISOString(), result);
    } catch (error) {
      console.error('❌ Error starting topic model training:', error);
      setIsTrainingActive(false);
    }
  };

  const handleAddToReport = (article: RSSArticle) => {
    // TODO: Implement add to report functionality
    console.log('Adding article to report:', article.title);
  };

  const handleViewText = (article: RSSArticle) => {
    if (!article.fullText) {
      alert('No full text available for this article');
      return;
    }

    // Create HTML content for the new window
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${article.title.replace(/"/g, '&quot;')}</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background: #fff;
              color: #333;
            }
            .header {
              border-bottom: 2px solid #eee;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #2563eb;
            }
            .meta {
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
            }
            .content {
              white-space: pre-wrap;
              word-wrap: break-word;
              line-height: 1.8;
            }
            .close-btn {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #ef4444;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            }
            .close-btn:hover {
              background: #dc2626;
            }
          </style>
        </head>
        <body>
          <button class="close-btn" onclick="window.close()">Close</button>
          <div class="header">
            <div class="title">${article.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <div class="meta">Source: ${article.source}</div>
            <div class="meta">Published: ${formatDate(article.publishedDate)}</div>
            <div class="meta">URL: <a href="${article.url}" target="_blank">${article.url}</a></div>
          </div>
          <div class="content">${article.fullText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </body>
      </html>
    `;

    // Open new window with the HTML content
    const newWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } else {
      alert('Popup blocked. Please allow popups for this site to view article text.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when date range changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-200 dark:bg-gray-700">
        <div className="flex items-center justify-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-4 text-lg">Loading RSS articles...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 p-10">
        <div className="alert alert-error">
          <span>Error loading RSS articles. Please try again.</span>
        </div>
      </div>
    );
  }

  const articles = articlesData?.articles || [];

  return (
    <>
      {/* Header */}
      <div className="flex flex-row bg-gray-200 dark:bg-gray-700 px-10 py-5">
        <div className="flex-col"><h2 className="text-2xl mr-3">RSS Articles</h2></div>
        <div className="flex-col grow">
          <div className="flex flex-row-reverse">
            <div className="flex space-x-3">
              <ButtonBasic
                label="Create Topic Model"
                color="btn-primary"
                buttonSize="btn-sm"
                onClick={handleCreateTopicModel}
                disabled={isTrainingLoading || isTrainingActive || (trainingStatus && trainingStatus.status === 'running') || articles.length === 0}
              />
              <ButtonBasic
                label="Collect RSS Articles"
                color="btn-secondary"
                buttonSize="btn-sm"
                onClick={handleCollectMissing}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 flex flex-col w-full gap-4">
        {/* Date Range Filter */}
        <div className="flex flex-row items-center gap-4 mb-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-gray-700 dark:text-gray-300">Start Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-gray-700 dark:text-gray-300">End Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
            />
          </div>
          <ButtonBasic
            label="Filter"
            color="btn-ghost"
            buttonSize="btn-sm"
            onClick={() => refetch()}
          />
        </div>

        {/* Download Status Display */}
        {queueStatus && queueStatus.currentJob && (
          <div className="alert alert-info mb-6 bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700">
            <div className="flex items-center">
              <div className="loading loading-spinner loading-sm mr-3"></div>
              <div className="flex-1">
                <div className="font-semibold text-blue-800 dark:text-blue-200">
                  RSS Collection in Progress
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {queueStatus.currentJob.progress.currentTask}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Progress: {queueStatus.currentJob.progress.current} / {queueStatus.currentJob.progress.total} jobs
                  {queueStatus.currentJob.progress.total > 0 && (
                    <span className="ml-2">
                      ({Math.round((queueStatus.currentJob.progress.current / queueStatus.currentJob.progress.total) * 100)}%)
                    </span>
                  )}
                </div>
                {queueStatus.queueLength > 0 && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {queueStatus.queueLength} more job(s) in queue
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Jobs remaining: {queueStatus.currentJob.progress.total - queueStatus.currentJob.progress.current}
                </div>
              </div>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-3">
              <div 
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: queueStatus.currentJob.progress.total > 0 
                    ? `${(queueStatus.currentJob.progress.current / queueStatus.currentJob.progress.total) * 100}%` 
                    : '0%' 
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Queue Status for pending jobs */}
        {queueStatus && !queueStatus.currentJob && queueStatus.queueLength > 0 && (
          <div className="alert alert-warning mb-6 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700">
            <div className="flex items-center">
              <i className="material-icons text-yellow-600 dark:text-yellow-400 mr-3">schedule</i>
              <div>
                <div className="font-semibold text-yellow-800 dark:text-yellow-200">
                  {queueStatus.queueLength} RSS collection job(s) queued
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  Jobs will be processed automatically
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BERTopic Training Status */}
        {(isTrainingLoading || isTrainingActive || (trainingStatus && trainingStatus.status === 'running')) && (
          <div className="alert alert-info mb-6 bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700">
            <div className="flex items-center">
              <div className="loading loading-spinner loading-sm mr-3"></div>
              <div className="flex-1">
                <div className="font-semibold text-purple-800 dark:text-purple-200">
                  Topic Model Training in Progress
                  {trainingStatus?.training_type && (
                    <span className="ml-2 badge badge-sm badge-outline text-purple-600 dark:text-purple-400">
                      {trainingStatus.training_type}
                    </span>
                  )}
                </div>
                
                {/* BERTopic-specific progress */}
                {trainingStatus?.bertopic_step && (
                  <div className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    <span className="font-medium">Status:</span> {trainingStatus.bertopic_step}
                  </div>
                )}
                
                {/* Documents and topics info */}
                <div className="flex flex-wrap gap-4 text-xs text-purple-600 dark:text-purple-400 mt-2">
                  {trainingStatus?.documents_loaded && trainingStatus.documents_loaded > 0 && (
                    <span>📄 {trainingStatus.documents_loaded} documents loaded</span>
                  )}
                  {trainingStatus?.topics_generated && trainingStatus.topics_generated > 0 && (
                    <span>🏷️ {trainingStatus.topics_generated} topics generated</span>
                  )}
                  {trainingStatus?.elapsed_time && (
                    <span>⏱️ {trainingStatus.elapsed_time.formatted} elapsed</span>
                  )}
                </div>
                
                {/* Fallback message */}
                {!trainingStatus?.bertopic_step && (
                  <div className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    {trainingStatus?.message || `Training model for articles from ${dateRange.startDate} to ${dateRange.endDate}`}
                  </div>
                )}
                
                {trainingStatus?.start_time && (
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Started: {new Date(trainingStatus.start_time).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Training Success Status */}
        {((trainingStatus && trainingStatus.status === 'completed') || lastCompletedTraining) && (
          <div className="alert alert-success mb-6 bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
            <div className="flex items-center">
              <i className="material-icons text-green-600 dark:text-green-400 mr-3">check_circle</i>
              <div className="flex-1">
                <div className="font-semibold text-green-800 dark:text-green-200">
                  Topic Model Training Completed!
                </div>
                <div className="mt-2 flex gap-2">
                  <ButtonBasic
                    label="View Topics"
                    color="btn-primary"
                    buttonSize="btn-sm"
                    onClick={() => navigate('/topics/emerging')}
                  />
                  <ButtonBasic
                    label="Dismiss"
                    color="btn-ghost"
                    buttonSize="btn-sm"
                    onClick={() => setLastCompletedTraining(null)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Training Error Status */}
        {trainingStatus && trainingStatus.status === 'failed' && (
          <div className="alert alert-error mb-6 bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700">
            <div className="flex items-center">
              <i className="material-icons text-red-600 dark:text-red-400 mr-3">error</i>
              <div>
                <div className="font-semibold text-red-800 dark:text-red-200">
                  Topic Model Training Failed
                </div>
                <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {trainingStatus.message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {statsData && (
          <div className="stats shadow mb-6 bg-white dark:bg-gray-800">
            <div className="stat">
              <div className="stat-title text-gray-600 dark:text-gray-400">Available Dates</div>
              <div className="stat-value text-sm text-gray-900 dark:text-gray-100">{statsData.stats.availableDates}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-gray-600 dark:text-gray-400">Recent Articles</div>
              <div className="stat-value text-sm text-gray-900 dark:text-gray-100">{statsData.stats.recentArticles}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-gray-600 dark:text-gray-400">Total Articles</div>
              <div className="stat-value text-sm text-gray-900 dark:text-gray-100">{articlesData?.total || 0}</div>
              <div className="stat-desc text-xs text-gray-500 dark:text-gray-400">
                Showing {articles.length} on page {currentPage}
              </div>
            </div>
            {queueStatus && (
              <div className="stat">
                <div className="stat-title text-gray-600 dark:text-gray-400">Queue Status</div>
                <div className="stat-value text-sm text-gray-900 dark:text-gray-100">
                  {queueStatus.isProcessing ? 'Processing' : 'Idle'} 
                  {queueStatus.totalJobs > 0 && (
                    <span className="text-xs ml-1">({queueStatus.totalJobs} jobs)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {articlesData && articlesData.total > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {articlesData.offset + 1} to {Math.min(articlesData.offset + articlesData.articles.length, articlesData.total)} of {articlesData.total} articles
            </div>
            
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, Math.ceil(articlesData.total / articlesPerPage)) }, (_, i) => {
                  const totalPages = Math.ceil(articlesData.total / articlesPerPage);
                  let pageNum;
                  
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                className="btn btn-sm btn-outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!articlesData.hasMore}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Articles Table */}
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full bg-white dark:bg-gray-800">
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Title</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <span className="text-lg mb-2">No articles found for selected date range</span>
                      <ButtonBasic
                        label="Collect Articles"
                        color="btn-primary"
                        buttonSize="btn-sm"
                        onClick={handleCollectMissing}
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id} className="hover">
                    <td className="font-mono text-sm">
                      {formatDate(article.publishedDate)}
                    </td>
                    <td>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">
                        {article.source}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary font-medium hover:text-primary-focus"
                          title={article.summary}
                        >
                          {article.title}
                        </a>
                        {article.summary && (
                          <span className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {article.summary.substring(0, 120)}...
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <DialogAddRssSource
                          title="Add to Report"
                          buttonType="icon"
                          buttonIcon="add"
                          buttonColor="btn-ghost"
                          buttonSize="btn-sm"
                          buttonLabel="Add to Report"
                          articleData={{
                            title: article.title,
                            link: article.url,
                            contentSnippet: article.summary
                          }}
                        />
                        {article.fullText && (
                          <button
                            onClick={() => handleViewText(article)}
                            className="btn btn-ghost btn-sm"
                            title="View full article text"
                          >
                            <i className="material-icons text-sm">article</i>
                          </button>
                        )}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          title="Open article"
                        >
                          <i className="material-icons text-sm">open_in_new</i>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default LayoutRSS;
