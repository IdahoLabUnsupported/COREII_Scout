// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import PlotlyGraph from '../components/elements/PlotlyGraph';
import CardStatusNested from '../components/cards/CardStatusNested';
import CardContent from '../components/cards/CardContent';
import ButtonBasic from '../components/elements/ButtonBasic';
import {
  useGetTopicInfoQuery,
  useGetTopicNamesQuery,
  useGetBarchartVisualizationQuery,
  useGetHierarchyVisualizationQuery,
  useGetHeatmapVisualizationQuery,
  useGetTopicsOverTimeVisualizationQuery,
  useGetIntertopicDistanceVisualizationQuery,
  useGetTopicDocumentsQuery,
  useFindTopicsMutation,
  useGetCurrentModelQuery,
  useGetModelMetadataQuery
} from '../../app/services/bertopicApi';
import { useGetRSSArticlesByIdsQuery, useSubmitSourceMutation, useAddSourceToReportMutation, useGetReportsQuery } from '../../app/services/client';
import { useAppSelector, useAppDispatch } from '../../app/hooks/reduxTypescriptHooks';
import { bertopicApi } from '../../app/services/bertopicApi';
import DialogAddRssSource from '../components/dialogs/DialogAddRssSource';
import { RootState } from '../../app/store';
import { Source } from '../../app/types/types';
import { setLoading, setSourceId } from '../../app/store/sourceIdReduxSlice';



const ViewTopicsEmerging: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // State for UI interactions
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedVisualization, setSelectedVisualization] = useState<'barchart' | 'hierarchy' | 'heatmap' | 'topics-over-time' | 'intertopic-distance'>('barchart');
  const [searchTerm, setSearchTerm] = useState('');

  // Current model info for display
  const { data: currentModel } = useGetCurrentModelQuery();
  const { data: modelMetadata } = useGetModelMetadataQuery(undefined, { skip: !currentModel?.loaded });

  // BERTopic API queries - skip if no model is loaded
  const skipQueries = !currentModel?.loaded;
  const { data: topicInfo, isLoading: topicInfoLoading, error: topicInfoError } = useGetTopicInfoQuery(undefined, { skip: skipQueries });
  const { data: topicNames, isLoading: topicNamesLoading } = useGetTopicNamesQuery(undefined, { skip: skipQueries });
  const { data: barchartData, isLoading: barchartLoading, error: barchartError } = useGetBarchartVisualizationQuery({}, { skip: skipQueries });
  const { data: hierarchyData, isLoading: hierarchyLoading, error: hierarchyError } = useGetHierarchyVisualizationQuery({}, { skip: skipQueries });
  const { data: heatmapData, isLoading: heatmapLoading, error: heatmapError } = useGetHeatmapVisualizationQuery({}, { skip: skipQueries });
  const { data: topicsOverTimeData, isLoading: topicsOverTimeLoading, error: topicsOverTimeError } = useGetTopicsOverTimeVisualizationQuery({}, { skip: skipQueries });
  const { data: intertopicDistanceData, isLoading: intertopicDistanceLoading, error: intertopicDistanceError } = useGetIntertopicDistanceVisualizationQuery({}, { skip: skipQueries });
  
  // Selected topic documents - use topic index directly  
  const { data: topicDocuments, error: documentsError, isLoading: documentsLoading } = useGetTopicDocumentsQuery(selectedTopicId!, { 
    skip: selectedTopicId === null 
  });

  // Get full RSS article details using the RSS IDs from BERTopic
  const { data: rssArticles, error: rssError, isLoading: rssLoading } = useGetRSSArticlesByIdsQuery(
    topicDocuments?.rss_article_ids || [], 
    { 
      skip: !topicDocuments?.rss_article_ids?.length 
    }
  );

  // Find topics mutation
  const [findTopics, { isLoading: findTopicsLoading }] = useFindTopicsMutation();
  
  // Bulk add to report functionality
  const { data: storeReportsList = [] } = useGetReportsQuery();
  const [submitSource] = useSubmitSourceMutation();
  const [submitSourceToReport] = useAddSourceToReportMutation();
  const currentReportId = useAppSelector((state: RootState) => state.reportId.reportId);
  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedReportForBulk, setSelectedReportForBulk] = useState<number | undefined>(undefined);

  // Reset selected topic when model changes
  useEffect(() => {
    console.log('Current model changed:', currentModel);
    setSelectedTopicId(null);
  }, [currentModel?.current_model]);

  // Force refetch topic data when model becomes loaded after training
  useEffect(() => {
    if (currentModel?.loaded && !skipQueries) {
      console.log('Model loaded, ensuring fresh topic data...');
      // Force invalidation of BertopicData to ensure fresh data after training
      dispatch(bertopicApi.util.invalidateTags(['BertopicData']));
    }
  }, [currentModel?.loaded, skipQueries]);


  // Handle loading and error states
  if (topicInfoLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-4 text-lg">Loading topic data...</span>
      </div>
    );
  }

  if (topicInfoError) {
    return (
      <div className="alert alert-error">
        <span>Error loading topic data. Please ensure a model has been trained first.</span>
      </div>
    );
  }

  if (!topicInfo || topicInfo.length === 0) {
    return (
      <div className="alert alert-warning">
        <span>No topics found. Please train a model first using the RSS Articles page.</span>
      </div>
    );
  }

  // Get current visualization data
  const getCurrentVisualizationData = () => {
    switch (selectedVisualization) {
      case 'barchart':
        return { data: barchartData, loading: barchartLoading };
      case 'hierarchy':
        return { data: hierarchyData, loading: hierarchyLoading };
      case 'heatmap':
        return { data: heatmapData, loading: heatmapLoading };
      case 'topics-over-time':
        return { data: topicsOverTimeData, loading: topicsOverTimeLoading };
      case 'intertopic-distance':
        return { data: intertopicDistanceData, loading: intertopicDistanceLoading };
      default:
        return { data: barchartData, loading: barchartLoading };
    }
  };

  const { data: currentVizData, loading: currentVizLoading } = getCurrentVisualizationData();

  // Simple console debugging without hooks
  console.log('🔍 Render state:', {
    selectedVisualization,
    currentVizLoading,
    hasCurrentVizData: !!currentVizData,
    hasErrors: !!(barchartError || hierarchyError || heatmapError || topicsOverTimeError || intertopicDistanceError)
  });

  const handleViewText = (article: any) => {
    if (!article.fullText) {
      alert('No full text available for this article');
      return;
    }

    // Helper function to format date
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

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

  // Open bulk add dialog with current report pre-selected
  const openBulkAddDialog = () => {
    if (!rssArticles?.articles || rssArticles.articles.length === 0) {
      alert('No articles available to add to report.');
      return;
    }
    
    // Default to current report if available
    const defaultReportId = currentReportId ? parseInt(currentReportId.toString()) : undefined;
    setSelectedReportForBulk(defaultReportId);
    setShowReportDialog(true);
  };

  // Handle bulk add all articles from current topic to report
  const handleAddAllToReport = async () => {
    if (!selectedReportForBulk) {
      alert('Please select a report first.');
      return;
    }

    if (!rssArticles?.articles || rssArticles.articles.length === 0) {
      alert('No articles available to add to report.');
      return;
    }

    setShowReportDialog(false);
    setIsAddingBulk(true);
    
    try {
      const successCount = [];
      const failCount = [];

      for (const article of rssArticles.articles) {
        try {
          const newSource: Source = {
            id: Date.now() + Math.random(), // Ensure unique ID
            title: article.title,
            sourceText: '',
            url: article.url,
            file: null,
            processed: 0,
            createdOn: new Date().toISOString(),
            actions: [],
            data: {
              sourceText: '',
              annotations: [],
            },
            authorFirst: '',
            authorLast: '',
            year: article.publishedDate ? new Date(article.publishedDate).getFullYear().toString() : '',
            publishedTitle: article.title,
            placement: article.source || '',
            city: '',
            publisher: article.source || '',
            enabled: true,
          };

          await submitSource({ outboundSource: newSource, reportId: selectedReportForBulk.toString() }).unwrap();
          const reportAndSourceIds = { reportId: selectedReportForBulk, sourceId: newSource.id };
          await submitSourceToReport(reportAndSourceIds).unwrap();
          
          successCount.push(article.title);
        } catch (error) {
          console.error(`Failed to add article "${article.title}":`, error);
          failCount.push(article.title);
        }
      }

      const totalArticles = rssArticles?.articles?.length || 0;
      const successMsg = `Successfully added ${successCount.length}/${totalArticles} articles to report.`;
      const failMsg = failCount.length > 0 ? `\n${failCount.length} articles failed to add.` : '';
      alert(successMsg + failMsg);

    } catch (error) {
      console.error('Bulk add to report failed:', error);
      alert('Failed to add articles to report. Please try again.');
    } finally {
      setIsAddingBulk(false);
    }
  };

  if (currentVizData) {
    console.log('📊 Current viz data:', {
      hasData: !!currentVizData.data,
      hasLayout: !!currentVizData.layout,
      dataLength: Array.isArray(currentVizData.data) ? currentVizData.data.length : 'N/A'
    });
  }

  return (
    <div className="space-y-6">
      {/* Current Model Banner */}
      {currentModel?.loaded && (
        <div className="alert alert-info">
          <span className="text-sm">
            📊 <strong>Current Model:</strong> {currentModel.current_model}
            {currentModel && " - Use the Models submenu in the left navigation to switch or manage models"}
          </span>
        </div>
      )}
      
      {!currentModel?.loaded && (
        <div className="alert alert-warning">
          <span className="text-sm">
            ⚠ <strong>No Model Loaded:</strong> Select a model from the Models submenu in the left navigation to view topic data
          </span>
        </div>
      )}

      {/* Stats + Controls + Visualization Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side - Stats */}
        <div>
          {/* Topic Overview Stats */}
          <div className="grid grid-cols-1 gap-4">
            {/* Model Creation Date */}
            {modelMetadata?.created_at && (
              <div className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title">Model Created</div>
                <div className="stat-value text-info text-lg">
                  {new Date(modelMetadata.created_at).toLocaleDateString()}
                </div>
                <div className="stat-desc">Training completion date</div>
              </div>
            )}
            {/* Training Date Range */}
            {modelMetadata?.training_info?.date_range && (
              <div className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title">Training Period</div>
                <div className="stat-value text-info text-lg">
                  {new Date(modelMetadata.training_info.date_range.start).toLocaleDateString()} - {new Date(modelMetadata.training_info.date_range.end).toLocaleDateString()}
                </div>
                <div className="stat-desc">Data collection period</div>
              </div>
            )}
            {/* Training Type */}
            {modelMetadata?.training_info?.training_type && (
              <div className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title">Training Type</div>
                <div className="stat-value text-info text-lg capitalize">
                  {modelMetadata.training_info.training_type}
                </div>
                <div className="stat-desc">
                  {modelMetadata.training_info.training_type === 'complex' 
                    ? 'Hyperparameter optimized' 
                    : 'Default parameters'}
                </div>
              </div>
            )}
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title">Total Topics</div>
              <div className="stat-value text-primary">{topicInfo.length}</div>
              <div className="stat-desc">Discovered by BERTopic</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title">Total Documents</div>
              <div className="stat-value text-primary">{topicInfo.reduce((sum, topic) => sum + topic.Count, 0)}</div>
              <div className="stat-desc">Across all topics</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title">Largest Topic</div>
              <div className="stat-value text-primary">{Math.max(...topicInfo.map(t => t.Count))}</div>
              <div className="stat-desc">Documents in largest topic</div>
            </div>
          </div>
        </div>

        {/* Right Side - Controls + Visualization */}
        <div className="lg:col-span-2 space-y-4">
          {/* Simplified Visualization Controls */}
          <CardStatusNested title="Visualization Controls" type="normal">
            <CardContent customPadding="p-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Visualization Type</span>
                </label>
                <select 
                  className="select select-bordered text-gray-900 dark:text-gray-100 font-medium" 
                  style={{ color: '#1f2937' }}
                  value={selectedVisualization}
                  onChange={(e) => setSelectedVisualization(e.target.value as any)}
                >
                  <option className="text-gray-800 dark:text-gray-200" value="barchart">Topic Word Scores</option>
                  <option className="text-gray-800 dark:text-gray-200" value="hierarchy">Topic Hierarchy</option>
                  <option className="text-gray-800 dark:text-gray-200" value="heatmap">Topic Similarity</option>
                  <option className="text-gray-800 dark:text-gray-200" value="topics-over-time">Topics Over Time</option>
                  <option className="text-gray-800 dark:text-gray-200" value="intertopic-distance">Intertopic Distance Map</option>
                </select>
              </div>
            </CardContent>
          </CardStatusNested>

          {/* Visualization */}
          <CardStatusNested title={`${selectedVisualization.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Visualization`} type="normal">
            <CardContent customPadding="p-4">
              {currentVizLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="loading loading-spinner loading-lg"></div>
                  <span className="ml-4">Loading visualization...</span>
                </div>
              ) : currentVizData ? (
                <PlotlyGraph
                  data={currentVizData.data}
                  layout={currentVizData.layout}
                />
              ) : (
                <div className="alert alert-warning">
                  <span>
                    {selectedVisualization === 'intertopic-distance' 
                      ? 'Intertopic distance visualization requires additional model fitting. Try switching to another visualization type.'
                      : 'Visualization data not available. Please check if the model was trained successfully.'
                    }
                  </span>
                  {/* Show specific error if available */}
                  {(barchartError || hierarchyError || heatmapError || topicsOverTimeError || intertopicDistanceError) && (
                    <div className="text-xs mt-2 text-error bg-error/10 p-2 rounded">
                      <strong>Error details:</strong> {
                        (() => {
                          const currentError = selectedVisualization === 'barchart' ? barchartError :
                                             selectedVisualization === 'hierarchy' ? hierarchyError :
                                             selectedVisualization === 'heatmap' ? heatmapError :
                                             selectedVisualization === 'topics-over-time' ? topicsOverTimeError :
                                             selectedVisualization === 'intertopic-distance' ? intertopicDistanceError : null;
                          
                          if (currentError && 'data' in currentError && currentError.data && typeof currentError.data === 'object' && 'detail' in currentError.data) {
                            return (currentError.data as any).detail;
                          } else if (currentError && 'message' in currentError) {
                            return currentError.message;
                          } else {
                            return JSON.stringify(currentError);
                          }
                        })()
                      }
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </CardStatusNested>
        </div>
      </div>

      {/* Topics List + Selected Topic Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side - Topics List (Running List) */}
        <div>
          <h3 className="text-lg font-semibold text-primary mb-4">Topics</h3>
          <div className="space-y-2">
            {[...topicInfo]
              .sort((a, b) => b.Count - a.Count) // Sort by document count
              .map((topic) => (
                <div
                  key={topic.Topic}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTopicId === topic.Topic
                      ? 'bg-primary text-primary-content border-primary'
                      : 'bg-base-100 hover:bg-base-200 border-base-300'
                  }`}
                  onClick={() => setSelectedTopicId(topic.Topic)}
                >
                  <div className={`font-medium text-sm ${
                    selectedTopicId === topic.Topic ? 'text-primary-content' : 'text-primary'
                  }`}>
                    {/* Display LLM-generated name if available and meaningful, otherwise fall back to CustomName/Name */}
                    {topic.llm && topic.llm[0] && topic.llm[0] !== "Security Related Topic" && topic.llm[0] !== "This Topic" && topic.llm[0] !== "General Topic" 
                      ? topic.llm[0] 
                      : (topic.CustomName || topic.Name)
                    }
                  </div>
                  {/* Display top keywords below the topic name */}
                  <div className={`text-xs mt-1 ${
                    selectedTopicId === topic.Topic ? 'text-primary-content opacity-80' : 'text-gray-500'
                  }`}>
                    {topic.Representation?.slice(0, 4).join(', ') || 'No keywords available'}
                  </div>
                  <div className={`text-xs mt-1 ${
                    selectedTopicId === topic.Topic ? 'text-primary-content opacity-80' : 'text-gray-500'
                  }`}>{topic.Count} documents</div>
                  <div className={`text-xs ${
                    selectedTopicId === topic.Topic ? 'text-primary-content opacity-70' : 'text-gray-500'
                  }`}>Topic {topic.Topic}</div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Side - Selected Topic Details */}
        <div>
          {selectedTopicId !== null ? (
            <CardStatusNested 
              title={`Topic ${selectedTopicId}: ${(() => {
                const selectedTopic = topicInfo.find(t => t.Topic === selectedTopicId);
                if (!selectedTopic) return 'Unknown Topic';
                // Use LLM name if available and meaningful, otherwise fall back
                const topicName = selectedTopic.llm && selectedTopic.llm[0] && 
                    selectedTopic.llm[0] !== "Security Related Topic" && 
                    selectedTopic.llm[0] !== "This Topic" && 
                    selectedTopic.llm[0] !== "General Topic" 
                  ? selectedTopic.llm[0] 
                  : (selectedTopic.CustomName || selectedTopic.Name);
                
                // Add keywords and document count to title
                const keywords = selectedTopic.Representation?.slice(0, 3).join(', ') || '';
                const docCount = selectedTopic.Count || 0;
                return `${topicName} | ${docCount} docs | ${keywords}`;
              })()}`} 
              type="normal"
            >
              <CardContent customPadding="p-4">
                <div className="space-y-4">
                  {documentsLoading || rssLoading ? (
                    <div className="text-sm opacity-70 flex items-center">
                      <span className="loading loading-spinner loading-xs mr-2"></span>
                      Loading articles...
                    </div>
                  ) : documentsError ? (
                    <div className="text-sm text-error">
                      Error loading topic data: {(documentsError as any)?.data?.message || (documentsError as any)?.message || 'Unknown error'}
                    </div>
                  ) : rssError ? (
                    <div className="text-sm text-error">
                      Error loading articles: {(rssError as any)?.data?.message || (rssError as any)?.message || 'Unknown error'}
                    </div>
                  ) : rssArticles?.articles && rssArticles.articles.length > 0 ? (
                    <div className="space-y-3">
                      {/* Bulk Add to Report Button - Moved to Top */}
                      <div className="mb-4 pb-3 border-b border-base-300">
                        <button
                          onClick={openBulkAddDialog}
                          disabled={isAddingBulk}
                          className="btn btn-primary btn-sm w-full"
                        >
                          {isAddingBulk ? (
                            <>
                              <span className="loading loading-spinner loading-xs mr-2"></span>
                              Adding {rssArticles.articles.length} articles...
                            </>
                          ) : (
                            <>
                              <i className="material-icons text-sm mr-1">add_box</i>
                              Add All {rssArticles.articles.length} Articles to Report
                            </>
                          )}
                        </button>
                      </div>
                      
                      {rssArticles.articles.map((article) => (
                        <div key={article.id} className="border border-base-300 bg-base-100 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-sm text-primary flex-1">
                              {article.title}
                            </div>
                            <div className="flex gap-2">
                              {article.fullText && (
                                <button
                                  onClick={() => handleViewText(article)}
                                  className="btn btn-ghost btn-sm"
                                  title="View full article text"
                                >
                                  <i className="material-icons text-sm">article</i>
                                </button>
                              )}
                              <DialogAddRssSource
                                title="Add Article to Report"
                                buttonType="icon"
                                buttonIcon="add"
                                buttonColor="btn-primary"
                                buttonSize="btn-sm"
                                buttonLabel="Add to Report"
                                articleData={{
                                  title: article.title,
                                  url: article.url,
                                  link: article.url, // Some components might use 'link' instead of 'url'
                                  pubDate: article.publishedDate,
                                  source: article.source,
                                  summary: article.summary
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                            <span>{article.source}</span>
                            <span>{new Date(article.publishedDate).toLocaleDateString()}</span>
                          </div>
                          
                          {article.summary && (
                            <div className="text-xs text-gray-600 mb-2 italic">
                              {article.summary.length > 200 ? `${article.summary.substring(0, 200)}...` : article.summary}
                            </div>
                          )}
                          
                          <div className="flex justify-end">
                            <a 
                              href={article.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs"
                            >
                              View Article →
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : topicDocuments ? (
                    <div className="text-sm opacity-70">
                      No articles found for this topic
                    </div>
                  ) : (
                    <div className="text-sm opacity-70">
                      Loading topic data...
                    </div>
                  )}
                </div>
              </CardContent>
            </CardStatusNested>
          ) : (
            <CardStatusNested title="Select a Topic" type="normal">
              <CardContent customPadding="p-4">
                <div className="text-sm opacity-70 text-center py-8">
                  Click on a topic from the list to view its documents
                </div>
              </CardContent>
            </CardStatusNested>
          )}
        </div>
      </div>

      {/* Report Selection Dialog for Bulk Add */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select Report</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose which report to add all {rssArticles?.articles?.length || 0} articles to:
            </p>
            
            <select
              value={selectedReportForBulk || ''}
              onChange={(e) => setSelectedReportForBulk(parseInt(e.target.value) || undefined)}
              className="select select-bordered w-full mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            >
              <option value="" disabled>Select a report</option>
              {storeReportsList.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.title}
                  {currentReportId && parseInt(currentReportId.toString()) === report.id && ' (Current)'}
                </option>
              ))}
            </select>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReportDialog(false)}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAllToReport}
                disabled={!selectedReportForBulk}
                className="btn btn-primary btn-sm"
              >
                <i className="material-icons text-sm mr-1">add_box</i>
                Add All Articles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTopicsEmerging;