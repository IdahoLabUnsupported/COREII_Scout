// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { AppReport, Source, Result, IReportSettings, RSSArticle, RSSCollectionJob, RSSQueueStatus, RSSFeedConfig, JobStatus } from '../../app/types/types';
import { getToken } from '../utils/authUtils';

export const clientApi = createApi({
  reducerPath: 'clientApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:3001',
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Report', 'Reports', 'Source', 'Sources', 'Result', 'Results', 'Settings', 'Users', 'RSSArticles', 'RSSJobs', 'RSSFeeds'],
  endpoints: (builder) => ({
    //reports
    submitReport: builder.mutation<AppReport, AppReport>({
      query: (outboundReport) => ({
        url: '/reports',
        method: 'POST',
        body: outboundReport,
      }),
      invalidatesTags: ['Reports'],
    }),
    deleteReport: builder.mutation({
      query: (id) => ({
        url: `/reports/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reports'],
    }),
    addSourceToReport: builder.mutation<any, { reportId: number; sourceId: number }>({
      query: ({ reportId, sourceId }) => ({
        url: `/reports/${reportId}/sources/${sourceId}`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, { reportId }) => [
        { type: 'Reports', id: reportId },
        'Reports',
        'Sources'
      ], // Invalidate specific report tag and Sources tag to refetch the data
    }),
    getReports: builder.query<AppReport[], void>({
      query: () => '/reports',
      providesTags: ['Reports'], // Provide Reports tag for this query
    }),
    getReport: builder.query<AppReport, string>({
      query: (reportId) => ({
        url: `/reports/${reportId}`,
        method: 'GET',
      }),
      providesTags: ['Report'], // Provide Sources tag for this query
    }),
    updateReportSynopsis: builder.mutation({
      query: ({ id, assignmentSynopsis }) => ({
        url: `/reports/updatesynopsis/${id}`,
        method: 'PUT',
        body: { assignmentSynopsis },
      }),
      invalidatesTags: ['Reports'], // Invalidate Reports tag to refetch the data
    }),
    updateReportRequirements: builder.mutation({
      query: ({ id, requirements }) => ({
        url: `/reports/updaterequirements/${id}`,
        method: 'PUT',
        body: { requirements },
      }),
      invalidatesTags: ['Reports'], // Invalidate Reports tag to refetch the data
    }),
    updateReport: builder.mutation<AppReport, Partial<AppReport>>({
      query: (partialReport) => ({
        url: `/reports/${partialReport.id}`,
        method: 'PATCH',
        body: partialReport,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Reports', id }],
    }),
    updateReportComments: builder.mutation({
      query: ({ id, comments }) => ({
        url: `/reports/comments/${id}`,
        method: 'PUT',
        body: { comments },
      }),
      invalidatesTags: ['Result', 'Results', 'Report']
    }),
    newGenReportVersion: builder.mutation({
      query: ({ id, newReportTextVersionData }) => ({
        url: `/reports/newgenreporttextversion/${id}`,
        method: 'PUT',
        body: { newReportTextVersionData },
      }),
      invalidatesTags: ['Result', 'Results']
    }),
    updateCurrentTextVersionId: builder.mutation({
      query: ({ id, newCurrentVersionId }) => ({
        url: `/reports/updatecurrenttextversionid/${id}`,
        method: 'POST',
        body: { newCurrentVersionId }
      })
    }),
    saveVersion: builder.mutation({ //const result = await saveVersion({ id: reportId, derivedFromSourceId: sourceId }).unwrap();
      query: ({ id, derivedFromSourceId }) => ({ //derivedFromSourceId is for the STIX version in result
        url: `/reports/saveversion/${id}`,
        method: 'POST',
        body: { derivedFromSourceId },
      }),
    }),
    getVersionRecords: builder.query({ // const { data: versionRecords, error, isLoading } = useGetVersionRecordsQuery(reportId); versionRecords.map((record) => ( <li key={record.version}>{`Version ${record.version}: ${record.textVersion}`}</li>
      query: (id) => `/reports/saveversion/${id}`,
    }),
    getCurrentReportText: builder.query({
      query: (id) => `/reports/reporttext/${id}`,
    }),
    callLlm: builder.query({
      query: (id) => `/reports/callllm/${id}`,
    }),
    getJobStatus: builder.query<JobStatus, string>({
      query: (id) => `/reports/job-status/${id}`,
      providesTags: (result, error, id) => [{ type: 'Report', id }],
    }),
    updateJobStatus: builder.mutation<JobStatus, { id: string; status: string; error?: string }>({
      query: ({ id, status, error }) => ({
        url: `/reports/job-status/${id}`,
        method: 'PUT',
        body: { status, error },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Report', id }],
    }),
    killJob: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/reports/kill-job/${id}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Report', id }],
    }),
    getReportComments: builder.query({
      query: (id) => `/reports/comments/${id}`,
      providesTags: ['Report']
    }),
    getStixView: builder.query({
      query: (id) => `/reports/getstixview/${id}`,
      providesTags: ['Source']
    }),
    updateReportSettings: builder.mutation<Report, { id: string, settings: IReportSettings }>({
      query: ({ id, settings }) => ({
        url: `/reports/settings/${id}`,
        method: 'PUT',
        body: settings,
      })
    }),
    updateReportPrompts: builder.mutation<void, { id: number; llmSystemPrompt?: string; llmUserPrompt?: string; }>({
      query: ({ id, llmSystemPrompt, llmUserPrompt }) => ({
        url: `/reports/prompts/${id}`,
        method: 'PUT',
        body: { llmSystemPrompt, llmUserPrompt },
      }),
    }),

    //sources
    /*submitSource: builder.mutation<Source, Source>({
    /*submitSource: builder.mutation<Source, Source>({
      query: (outboundSource) => ({
        url: '/sources',
        method: 'POST',
        body: outboundSource,
      }),
      invalidatesTags: ['Report', 'Reports', 'Sources', 'Results'], // Invalidate Sources tag to refetch the data
    }),*/
    //sources
    submitSource: builder.mutation<Source, { outboundSource: Source, reportId: string }>({
      query: ({ outboundSource, reportId }) => {
        const formData = new FormData();
        if (outboundSource.file !== null && outboundSource.file !== undefined) {
          formData.append('file', outboundSource.file);
        } else {
          //file is null or undefined. could log an error, throw an exception, or set a default value
        }
        Object.keys(outboundSource).forEach((key) => {
          if (key !== 'file') {
            formData.append(key, outboundSource[key as keyof Source]);
          }
        });

        return {
          url: '/sources',
          method: 'POST',
          body: formData,
          headers: {
            'X-Report-ID': reportId
          }
        };
      },
      invalidatesTags: ['Report', 'Reports', 'Sources', 'Results'], // Invalidate Sources tag to refetch the data
    }),
    getSource: builder.query<Source, string>({
      query: (sourceId) => ({
        url: `/sources/${sourceId}`,
        method: 'GET',
      }),
      providesTags: ['Source'], // Provide Sources tag for this query
    }),
    updateSource: builder.mutation({
      query: ({ source }) => ({
        url: `/sources/${source.id}`,
        method: 'PUT',
        body: { source },
      }),
      invalidatesTags: [
        'Reports',
        'Sources'
      ],
    }),
    getSources: builder.query<Source[], void>({
      query: () => '/sources',
      providesTags: ['Sources'], // Provide Sources tag for this query
    }),
    deleteSource: builder.mutation({
      query: ({ sourceId, reportId, _id }) => ({
        url: `/sources/${sourceId}`,
        method: 'DELETE',
        body: { reportId, _id },
      }),
      invalidatesTags: [
        'Source',
        'Reports'
      ],
    }),
    // example call: const [updateSourceEnable, { isLoading, isError, isSuccess }] = useUpdateSourceEnableMutation();
    // (in component): let enabled = false
    // updateSourceEnable({ id, enabled }).unwrap();
    updateSourceEnable: builder.mutation({
      query: ({ sourceId, enabled }) => ({
        url: `/sources/updateenabled/${sourceId}`,
        method: 'PUT',
        body: { enabled },
      }),
      invalidatesTags: ['Source']
    }),
    reprocessSource: builder.mutation<void, { id: string; source: Source }>({
      query: ({ id, source }) => ({
        url: `/sources/reprocess/${id}`,
        method: 'PUT',
        body: { source },
      }),
    }),

    //results
    getResult: builder.query<Result, string>({
      query: (derivedSourceId) => ({
        url: `/investigations/${derivedSourceId}`,
        method: 'GET',
      }),
      providesTags: ['Result'], // Provide Result tag for this query
    }),
    deleteResult: builder.mutation({
      query: (derivedSourceId) => ({
        url: `/investigations/${derivedSourceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Result'],
    }),
    getResults: builder.query<Result[], void>({
      query: () => '/investigations',
      providesTags: ['Results'], // Provide Results tag for this query
    }),
    newStixVersion: builder.mutation({
      query: ({ resultId, newStixVersion }) => ({
        url: `/investigations/newstixversion/${resultId}`,
        method: 'PUT',
        body: { newStixVersion },
      }),
      invalidatesTags: ['Result', 'Results']
    }),

    getBulkResults: builder.query({
      query: (ids) => ({
        url: '/investigations/getbulkresults',
        method: 'POST',
        body: { ids },
      }),
      providesTags: ['Results'], // Provide Results tag for this query
    }),
    updateStix: builder.mutation({
      query: ({ derivedSourceId, newStix }) => ({
        url: `/investigations/updatestix/${derivedSourceId}`,
        method: 'PUT',
        body: { newStix },
      }),
      invalidatesTags: ['Results'], // Invalidate Reports tag to refetch the data
    }),
    updateGeneratedText: builder.mutation({
      query: ({ derivedSourceId, generatedReportText }) => ({
        url: `/investigations/updategeneratedtext/${derivedSourceId}`,
        method: 'PUT',
        body: { generatedReportText },
      }),
      invalidatesTags: ['Results'], // Invalidate Reports tag to refetch the data
    }),
    updateHighlightRange: builder.mutation({
      query: ({ resultId, updatedRanges, entityText }) => ({
        url: `/investigations/updateHighlightRange/${resultId}`,
        method: 'PUT',
        body: { updatedRanges, entityText },
      }),
      invalidatesTags: ['Result', 'Results'],
    }),
    deleteHighlightRange: builder.mutation({
      query: ({ resultId, range }) => ({
        url: `/investigations/deleteHighlightRange/${resultId}`,
        method: 'DELETE',
        body: { range },
      }),
      invalidatesTags: ['Result', 'Results'],
    }),
    updateInvestigation: builder.mutation({ //const [updateInvestigation] = useUpdateInvestigationMutation(); const updateField = "updated comment string"; await updateInvestigation({ derivedFromSourceId, updateField }).unwrap(); 
      query: ({ derivedFromSourceId, updateField }) => ({
        url: `/investigations/updatecomments/${derivedFromSourceId}`,
        method: 'PUT',
        body: { updateField },
      }),
    }),
    updateEntity: builder.mutation({
      query: ({ resultId, index, updateType, newValue }) => ({
        url: `/investigations/updateEntity/${resultId}`,
        method: 'PUT',
        body: { index, updateType, newValue },
      }),
      invalidatesTags: ['Result', 'Results'],
    }),
    getTrimmedStix: builder.query({
      query: (derivedSourceId) => `/investigations/trimmedstix/${derivedSourceId}`, //const { data, error, isLoading } = useGetTrimmedStixQuery(derivedSourceId);
    }),

    updateCurrentStixVersionId: builder.mutation({
      query: ({ id, newCurrentVersionId }) => ({
        url: `/investigations/updatecurrentstixversionid/${id}`,
        method: 'POST',
        body: { newCurrentVersionId }
      })
    }),

    //rss or other services
    getRssFeed: builder.query({
      query: () => '/rss', //const { data, error, isLoading } = useGetRssFeedQuery(); data.items.map...
    }),
    createOrUpdateSettings: builder.mutation({
      query: (settingsObject) => ({
        url: `/settings`,
        method: 'POST',
        body: settingsObject,
      }),
      invalidatesTags: ['Settings']
    }),
    getSettings: builder.query({
      query: (settingName) => ({
        url: `/settings`,
        method: 'GET',
        params: { settingName },
      }),
      providesTags: ['Settings']
    }),
    //auth: register, login, forgot password
    register: builder.mutation({
      query: (newUser) => ({
        url: '/register',
        method: 'POST',
        body: newUser,
      }),
    }),
    login: builder.mutation({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    getUsers: builder.query({
      query: () => '/users',
      providesTags: ['Users'],
    }),
    getUserEmailFromJwt: builder.query({
      query: () => '/jwt',
    }),
    saveKey: builder.mutation({
      query: ({ key }) => ({
        url: '/users/key',
        method: 'POST',
        body: { key },
      }),
    }),
    getKey: builder.query({
      query: () => '/users/get/key',
    }),

    // RSS Articles endpoints
    getRSSArticles: builder.query<{ articles: RSSArticle[], total: number, offset: number, limit: number, hasMore: boolean }, { startDate?: string, endDate?: string, limit?: number, offset?: number }>({
      query: ({ startDate, endDate, limit, offset }) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (limit) params.append('limit', limit.toString());
        if (offset) params.append('offset', offset.toString());
        return `/api/rss-collector/rss-articles?${params.toString()}`;
      },
      providesTags: ['RSSArticles'],
    }),
    
    getRSSArticlesByDate: builder.query<{ articles: RSSArticle[], total: number, date: string }, string>({
      query: (date) => `/api/rss-collector/rss-articles/${date}`,
      providesTags: ['RSSArticles'],
    }),
    
    getRSSAvailableDates: builder.query<{ dates: string[] }, void>({
      query: () => '/api/rss-collector/rss-dates',
      providesTags: ['RSSArticles'],
    }),
    
    collectRSSArticles: builder.mutation<{ success: boolean, message: string, jobId: string }, { startDate: string, endDate: string, recollect?: boolean }>({
      query: ({ startDate, endDate, recollect }) => ({
        url: '/api/rss-collector/rss-collect',
        method: 'POST',
        body: { startDate, endDate, recollect },
      }),
      invalidatesTags: ['RSSArticles', 'RSSJobs'],
    }),
    
    collectDailyRSS: builder.mutation<{ success: boolean, message: string, jobId: string }, void>({
      query: () => ({
        url: '/api/rss-collector/rss-collect-daily',
        method: 'POST',
      }),
      invalidatesTags: ['RSSArticles', 'RSSJobs'],
    }),
    
    getRSSStats: builder.query<{ stats: { availableDates: number, recentArticles: number, oldestDate: string, newestDate: string } }, void>({
      query: () => '/api/rss-collector/rss-stats',
      providesTags: ['RSSArticles'],
    }),

    // RSS Job Queue endpoints
    getRSSQueueStatus: builder.query<RSSQueueStatus, void>({
      query: () => '/api/rss-collector/rss-queue-status',
      providesTags: ['RSSJobs'],
    }),
    
    getRSSJob: builder.query<{ job: RSSCollectionJob }, string>({
      query: (jobId) => `/api/rss-collector/rss-job/${jobId}`,
      providesTags: (result, error, jobId) => [{ type: 'RSSJobs', id: jobId }],
    }),
    
    getAllRSSJobs: builder.query<{ jobs: RSSCollectionJob[] }, void>({
      query: () => '/api/rss-collector/rss-jobs',
      providesTags: ['RSSJobs'],
    }),

    // RSS Feed Management endpoints
    getRSSFeeds: builder.query<{ feeds: RSSFeedConfig[] }, void>({
      query: () => '/api/rss-collector/rss-feeds',
      providesTags: ['RSSFeeds'],
    }),
    
    addRSSFeed: builder.mutation<{ feed: RSSFeedConfig }, Partial<RSSFeedConfig>>({
      query: (feed) => ({
        url: '/api/rss-collector/rss-feeds',
        method: 'POST',
        body: feed,
      }),
      invalidatesTags: ['RSSFeeds'],
    }),
    
    updateRSSFeed: builder.mutation<{ feed: RSSFeedConfig }, { id: string } & Partial<RSSFeedConfig>>({
      query: ({ id, ...feed }) => ({
        url: `/api/rss-collector/rss-feeds/${id}`,
        method: 'PUT',
        body: feed,
      }),
      invalidatesTags: ['RSSFeeds'],
    }),
    
    deleteRSSFeed: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/api/rss-collector/rss-feeds/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RSSFeeds'],
    }),
    
    importRSSFeeds: builder.mutation<{ message: string, imported: number }, { csvContent?: string, feeds?: RSSFeedConfig[], replace?: boolean }>({
      query: ({ csvContent, feeds, replace }) => ({
        url: '/api/rss-collector/rss-feeds/import',
        method: 'POST',
        body: { csvContent, feeds, replace },
      }),
      invalidatesTags: ['RSSFeeds'],
    }),
    
    exportRSSFeeds: builder.query<string, void>({
      query: () => ({
        url: '/api/rss-collector/rss-feeds/export',
        responseHandler: (response) => response.text(),
      }),
    }),
    
    deleteRSSDataForDate: builder.mutation<{ message: string }, string>({
      query: (date) => ({
        url: `/api/rss-collector/rss-data/${date}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RSSArticles'],
    }),
    
    deleteOldRSSData: builder.mutation<{ message: string, deletedCount: number }, string>({
      query: (date) => ({
        url: `/api/rss-collector/rss-data/older-than/${date}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RSSArticles'],
    }),
    
    deleteAllRSSData: builder.mutation<{ message: string, deletedArticles: number, deletedFiles: number }, void>({
      query: () => ({
        url: '/api/rss-collector/rss-data/all',
        method: 'DELETE',
      }),
      invalidatesTags: ['RSSArticles'],
    }),

    // Topic Models Management
    deleteAllTopicModels: builder.mutation<{ message: string, deleted_count: number, deleted_models: string[] }, void>({
      query: () => ({
        url: 'http://localhost:8003/model/delete-all',
        method: 'DELETE',
      }),
    }),

    // Get articles by array of IDs 
    getRSSArticlesByIds: builder.query<{ articles: RSSArticle[] }, string[]>({
      query: (ids) => ({
        url: '/api/rss-collector/rss-articles/by-ids',
        method: 'POST',
        body: { ids },
      }),
      providesTags: ['RSSArticles'],
    }),

  }),
});

export const {
  useSubmitReportMutation,
  useDeleteReportMutation,
  useGetReportsQuery,
  useGetReportQuery,
  useAddSourceToReportMutation,
  useNewGenReportVersionMutation,
  useUpdateReportSynopsisMutation,
  useUpdateReportRequirementsMutation,
  useUpdateReportMutation,
  useUpdateReportCommentsMutation,
  useUpdateReportPromptsMutation,
  useUpdateReportSettingsMutation,
  useSaveVersionMutation,
  useGetVersionRecordsQuery,
  useUpdateCurrentTextVersionIdMutation,
  useGetCurrentReportTextQuery,
  useCallLlmQuery,
  useGetJobStatusQuery,
  useUpdateJobStatusMutation,
  useKillJobMutation,
  useGetReportCommentsQuery,
  useGetStixViewQuery,

  useSubmitSourceMutation,
  useGetSourceQuery,
  useGetSourcesQuery,
  useUpdateSourceMutation,
  useDeleteSourceMutation,
  useUpdateSourceEnableMutation,
  useReprocessSourceMutation,

  useGetResultQuery,
  useDeleteResultMutation,
  useGetResultsQuery,
  useGetBulkResultsQuery,
  useNewStixVersionMutation,
  useUpdateStixMutation,
  useUpdateGeneratedTextMutation,
  useUpdateCurrentStixVersionIdMutation,

  useUpdateHighlightRangeMutation,
  useDeleteHighlightRangeMutation,
  useUpdateInvestigationMutation,
  useUpdateEntityMutation,

  useGetRssFeedQuery,
  useCreateOrUpdateSettingsMutation,
  useGetSettingsQuery,

  useLoginMutation,
  useRegisterMutation,
  useGetUsersQuery,
  useGetUserEmailFromJwtQuery,
  useSaveKeyMutation,
  useGetKeyQuery,

  // RSS hooks
  useGetRSSArticlesQuery,
  useGetRSSArticlesByDateQuery,
  useGetRSSAvailableDatesQuery,
  useCollectRSSArticlesMutation,
  useCollectDailyRSSMutation,
  useGetRSSStatsQuery,

  // RSS Job Queue hooks
  useGetRSSQueueStatusQuery,
  useGetRSSJobQuery,
  useGetAllRSSJobsQuery,

  // RSS Feed Management hooks
  useGetRSSFeedsQuery,
  useAddRSSFeedMutation,
  useUpdateRSSFeedMutation,
  useDeleteRSSFeedMutation,
  useImportRSSFeedsMutation,
  useExportRSSFeedsQuery,
  useLazyExportRSSFeedsQuery,
  useDeleteRSSDataForDateMutation,
  useDeleteOldRSSDataMutation,
  useDeleteAllRSSDataMutation,
  useDeleteAllTopicModelsMutation,
  useGetRSSArticlesByIdsQuery,
} = clientApi;
