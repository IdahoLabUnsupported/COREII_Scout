// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks/reduxTypescriptHooks';
import { appStateActions } from '../../../app/store';
import { AppReport } from '../../../app/types/types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toUrlFriendly } from '../../../app/utils/urlHelpers';
import DialogCreateReport from '../../components/dialogs/DialogCreateReport';
import { useGetReportsQuery } from '../../../app/services/client';
import useNavigationGuard from '../../../app/hooks/useNavigationGuard';
import { useDirtyContext } from '../../contexts/DirtyContext';
import { 
  useGetAvailableModelsQuery, 
  useGetCurrentModelQuery, 
  useSwitchModelMutation,
  useDeleteModelMutation,
  useClearModelMutation 
} from '../../../app/services/bertopicApi';

const Drawer = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: storeReportsList = [], isLoading } = useGetReportsQuery();
  const storeReportsSharedList = useAppSelector((state: any) => state.appState.reportsSharedList);
  const storeCommonLinksList = useAppSelector((state: any) => state.appState.commonLinksList);
  const selectedReportIndex = useAppSelector((state: any) => state.appState.selectedReportIndex);
  const { isDirty } = useDirtyContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePath, setActivePath] = useState(location.pathname);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  const removeFocusFromAllLinks = () => {
    const drawerLinks = document.querySelectorAll(':where(.menu li:not(.menu-title, .disabled) > *:not(ul, details, .menu-title)):not(summary, .active, .btn):focus');
    drawerLinks.forEach(link => { (link as HTMLElement).blur(); });
  };
   const { checkNavigation } = useNavigationGuard("You have unsaved changes. Do you really want to leave?", () => {
    removeFocusFromAllLinks();
    setActivePath(location.pathname);
  });

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    '1': true,
    '2': false,
    '3': false,
    '4': false,
    '5': false,
    'models': false

  });

  // Model Management API queries
  const { data: availableModels, isLoading: modelsLoading, refetch: refetchModels } = useGetAvailableModelsQuery();
  const { data: currentModel } = useGetCurrentModelQuery();
  const [switchModel, { isLoading: switchingModel }] = useSwitchModelMutation();
  const [deleteModel, { isLoading: deletingModel }] = useDeleteModelMutation();
  const [clearModel] = useClearModelMutation();

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  const toggleDropdown = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
    
    // If opening the Topics section (id === '4'), refresh models list
    // This ensures models are fresh when user navigates to topics after training
    if (id === '4' && !openSections[id]) {
      refetchModels();
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSetSelectedReportIndex = (index: number | null) => {
    if (index === null) {
      dispatch(appStateActions.setSelectedReportIndex(null));
    } else {
      const selectedReport = storeReportsList[index];
      dispatch(appStateActions.setSelectedReportIndex(index));
      navigate(`/reports/${toUrlFriendly(selectedReport.title)}`);
    }
  };

  const handleIconClick = (id: string) => {
    if (isCollapsed) {
      setOpenSections({ ...openSections, [id]: true });
      setIsCollapsed(false);
    } else {
      toggleDropdown(id);
    }
  };

  const isActive = (path: string) => {
    return activePath === path ? 'bg-gray-300 dark:bg-gray-700' : '';
  };

  const handleClick = (e: React.MouseEvent, path: string, index: number | null) => {
    const canNavigate = checkNavigation();
    if (!canNavigate) {
      e.preventDefault();
      return;
    }
    setActivePath(path);
    handleSetSelectedReportIndex(index);
  };

  // Handle model switching
  const handleModelSwitch = async (modelName: string) => {
    try {
      const result = await switchModel({ modelName }).unwrap();
      
      // Add a small delay to ensure cache invalidation propagates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to emerging topics after switching model
      navigate('/topics/emerging');
      setActivePath('/topics/emerging');
      handleSetSelectedReportIndex(null);
      
    } catch (error) {
      console.error('Failed to switch model:', error);
      alert('Failed to switch model. Please try again.');
    }
  };

  // Handle model deletion
  const handleModelDelete = async (e: React.MouseEvent, modelName: string) => {
    e.stopPropagation(); // Prevent navigation
    if (confirm(`Are you sure you want to delete the model "${modelName}"? This action cannot be undone.`)) {
      try {
        const result = await deleteModel({ modelName }).unwrap();
        if (result.unloaded_current) {
          alert(`Model "${modelName}" was deleted. No model is currently loaded.`);
        }
      } catch (error) {
        console.error('Failed to delete model:', error);
        alert('Failed to delete model. Please try again.');
      }
    }
  };
  return (
    <aside className={`bg-slate-300 dark:bg-gray-950 text-base-content ${isCollapsed ? 'w-14' : 'w-80'}`} style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex flex-col justify-between h-full">
        <div>
          <ul className="menu text-gray-800 dark:text-gray-200">
            <li>
              <button onClick={toggleCollapse} className="flex items-center justify-center w-[40px] h-[40px] rounded-lg ml-auto my-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                <span className="material-icons">
                  {isCollapsed ? 'menu' : 'menu_open'}
                </span>
              </button>
            </li>
            <li>
              <Link
                to="/"
                className={`px-2 h-[48px] !gap-0 flex items-center hover:bg-gray-200 dark:hover:bg-gray-700  ${isActive('/')}`}
                onClick={(e) => handleClick(e, '/', null)}
              >
                <span className="material-icons">
                  {isCollapsed ? 'dashboard' : 'dashboard'}
                </span>
                {!isCollapsed && <span className={`whitespace-nowrap overflow-hidden ml-2`}>Getting Started</span>}
              </Link>
            </li>
            <li className={`hover:bg-slate-300 dark:hover:bg-slate-800 ${isCollapsed ? 'w-[40px]' : ''} rounded ${openSections['1'] ? 'open' : ''}`}>
              <div className={`px-2 !gap-0 flex justify-between items-center cursor-pointer`} onClick={() => handleIconClick('1')}>
                <span className="flex items-center h-[32px]">
                  <span className="material-icons">
                    {isCollapsed ? 'folder' : 'folder'}
                  </span>
                  {!isCollapsed && <span className="ml-2">My Reports</span>}
                </span>
                {!isCollapsed && (
                  <div className="flex items-center gap-1">
                    <DialogCreateReport
                      title="Create a New Report"
                      buttonType="icon"
                      buttonColor="btn-ghost"
                      buttonSize="btn-sm"
                      buttonIcon="add"
                    />
                    <span className={`material-icons ${openSections['1'] ? 'rotate-180' : ''} transition-transform`}>expand_more</span>
                  </div>
                )}
              </div>
              {!isCollapsed && openSections['1'] && (
                <ul className="!rounded-md pl-3">
                  {isLoading ? (
                    <div className="px-6 text-gray-500">Loading...</div>
                  ) : (
                    storeReportsList.length > 0 ? (
                      storeReportsList.map((report: AppReport, index: number) => {
                        const isSelected = selectedReportIndex === index;
                        return (
                          <li
                            key={index}
                            className={`w-full min-w-0 max-w-[275px] rounded-md cursor-pointer nav-link ${isSelected ? 'bg-gray-500 dark:bg-gray-700 text-white' : ''}`}
                            onClick={(e) => handleClick(e, `/reports/${toUrlFriendly(report.title)}`, index)}
                            title={report.title}
                          >
                            <div className="pl-2 flex items-center min-w-0 w-full">
                              <span className="material-icons scale-75">fingerprint</span>
                              <span className="truncate" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {report.title}
                              </span>
                            </div>
                          </li>
                        );
                      })
                    ) : (
                      <div className="px-6 text-gray-500">No reports to display</div>
                    )
                  )}
                </ul>
              )}
            </li>
            <li className={`hover:bg-slate-300 dark:hover:bg-slate-800 ${isCollapsed ? 'w-[40px]' : ''} rounded ${openSections['2'] ? 'open' : ''}`}>
              <div className={`px-2 !gap-0 flex justify-between items-center cursor-pointer`} onClick={() => handleIconClick('2')}>
                <span className="flex items-center h-[32px]">
                  <span className="material-icons">
                    {isCollapsed ? 'folder_shared' : 'folder_shared'}
                  </span>
                  {!isCollapsed && <span className="ml-2">Reports Shared With Me</span>}
                </span>
                {!isCollapsed && (
                  <div className="flex items-center gap-1">
                    <DialogCreateReport
                      title="Add a Shared Report"
                      buttonType="icon"
                      buttonColor="btn-ghost"
                      buttonSize="btn-sm"
                      buttonIcon="add"
                    />
                    <span className={`material-icons ${openSections['2'] ? 'rotate-180' : ''} transition-transform`}>expand_more</span>
                  </div>
                )}
              </div>
              {!isCollapsed && openSections['2'] && (
                <ul className="pl-3">
                  {storeReportsSharedList.length > 0 ? (
                    storeReportsSharedList.map((report: AppReport, index: number) => (
                      <li key={index} className="flex flex-row items-center pl-1 py-1 rounded-md cursor-pointer" title={report.title}>
                        <span className="material-icons" style={{ fontSize: '1rem' }}>fingerprint</span>
                        <span>{report.title}</span>
                      </li>
                    ))
                  ) : (
                    <div className="py-2 px-6 text-gray-500">No shared reports to display</div>
                  )}
                </ul>
              )}
            </li>
            <li className={`hover:bg-slate-300 dark:hover:bg-slate-800 ${isCollapsed ? 'w-[40px]' : ''} rounded ${openSections['3'] ? 'open' : ''}`}>
              <div className={`px-2 !gap-0 flex justify-between items-center cursor-pointer`} onClick={() => handleIconClick('3')}>
                <span className="flex items-center h-[32px]">
                  <span className="material-icons">
                    {isCollapsed ? 'link' : 'link'}
                  </span>
                  {!isCollapsed && <span className="ml-2">Commonly Used Links</span>}
                </span>
                {!isCollapsed && (
                  <div className="flex items-center gap-1">
                    <DialogCreateReport
                      title="Add a Link"
                      buttonType="icon"
                      buttonColor="btn-ghost"
                      buttonSize="btn-sm"
                      buttonIcon="add"
                    />
                    <span className={`material-icons ${openSections['3'] ? 'rotate-180' : ''} transition-transform`}>expand_more</span>
                  </div>
                )}
              </div>
              {!isCollapsed && openSections['3'] && (
                <ul className="pl-3">
                  {storeCommonLinksList.length > 0 ? (
                    storeCommonLinksList.map((link: { title: string }, index: number) => (
                      <li key={index} className="flex flex-row items-center pl-1 py-1 rounded-md cursor-pointer" title={link.title}>
                        <span className="material-icons" style={{ fontSize: '1.4rem' }}>link</span>
                        <span>{link.title}</span>
                      </li>
                    ))
                  ) : (
                    <div className="py-2 px-6 text-gray-500">No commonly used links to display</div>
                  )}
                </ul>
              )}
            </li>
            <li>
              <Link
                to="/rss-feeds"
                className={`px-2 h-[48px] !gap-0 flex items-center hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive('/rss-feeds')}`}
                onClick={() => handleSetSelectedReportIndex(null)}
              >
                <span className="material-icons">
                  {isCollapsed ? 'rss_feed' : 'rss_feed'}
                </span>
                {!isCollapsed && <span className={`whitespace-nowrap overflow-hidden ml-2`}>RSS Feeds</span>}
              </Link>
            </li>
            <li className={`hover:bg-slate-300 dark:hover:bg-slate-800 ${isCollapsed ? 'w-[40px]' : ''} rounded ${openSections['4'] ? 'open' : ''}`}>
              <div className={`px-2 !gap-0 flex justify-between items-center cursor-pointer`} onClick={() => handleIconClick('4')}>
                <span className="flex items-center h-[32px]">
                  <span className="material-icons">hub</span>
                  {!isCollapsed && <span className="ml-2">Topics</span>}
                </span>
                {!isCollapsed && (
                  <span className={`material-icons ${openSections['4'] ? 'rotate-180' : ''} transition-transform`}>expand_more</span>
                )}
              </div>
              {!isCollapsed && openSections['4'] && (
                <ul className="!rounded-md pl-3">
                  <li className={`w-full min-w-0 max-w-[275px] rounded-md cursor-pointer nav-link ${isActive('/topics/emerging') ? 'bg-gray-500 dark:bg-gray-700 text-white' : ''}`}>
                    <Link
                      to="/topics/emerging"
                      className="pl-2 flex items-center min-w-0 w-full"
                      onClick={() => handleSetSelectedReportIndex(null)}
                    >
                      <span className="material-icons scale-75">insights</span>
                      <span className="truncate" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Emerging Topics
                      </span>
                    </Link>
                  </li>
                  
                  {/* Topic Models directly under Emerging Topics */}
                  {modelsLoading ? (
                    <li className="text-xs text-gray-500 px-2 py-1 ml-8">Loading models...</li>
                  ) : availableModels && availableModels.models.length > 0 ? (
                    availableModels.models.map((model) => (
                      <li key={model.name} className="group ml-6">
                        <div
                          className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                            model.is_current ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : ''
                          }`}
                          onClick={() => handleModelSwitch(model.name)}
                          title={`${model.name} - ${model.num_topics || 0} topics, ${model.total_documents || 0} docs`}
                        >
                          <span className="truncate flex-1 min-w-0">
                            {model.name.replace('bertopic_model_', '').substring(0, 20)}
                            {model.is_current && ' ★'}
                          </span>
                          <button
                            className="opacity-0 group-hover:opacity-100 ml-1 text-red-500 hover:text-red-700 transition-opacity"
                            onClick={(e) => handleModelDelete(e, model.name)}
                            disabled={deletingModel}
                            title="Delete model"
                          >
                            🗑️
                          </button>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-gray-500 px-2 py-1 ml-8">No models available</li>
                  )}
                  {switchingModel && (
                    <li className="text-xs text-blue-500 px-2 py-1 flex items-center ml-8">
                      <span className="loading loading-spinner loading-xs mr-1"></span>
                      Switching...
                    </li>
                  )}
                  
                  <li className={`w-full min-w-0 max-w-[275px] rounded-md cursor-pointer nav-link ${isActive('/topics/my-topics') ? 'bg-gray-500 dark:bg-gray-700 text-white' : ''}`}>
                    <Link
                      to="/topics/my-topics"
                      className="pl-2 flex items-center min-w-0 w-full"
                      onClick={() => handleSetSelectedReportIndex(null)}
                    >
                      <span className="material-icons scale-75">bookmark</span>
                      <span className="truncate" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        My Topics
                      </span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
            <li className={`hover:bg-slate-300 dark:hover:bg-slate-800 ${isCollapsed ? 'w-[40px]' : ''} rounded ${openSections['5'] ? 'open' : ''}`}>
              <div className={`px-2 !gap-0 flex justify-between items-center cursor-pointer`} onClick={() => handleIconClick('5')}>
                <span className="flex items-center h-[32px]">
                  <span className="material-icons">settings</span>
                  {!isCollapsed && <span className="ml-2">Configuration</span>}
                </span>
                {!isCollapsed && (
                  <span className={`material-icons ${openSections['5'] ? 'rotate-180' : ''} transition-transform`}>expand_more</span>
                )}
              </div>
              {!isCollapsed && openSections['5'] && (
                <ul className="!rounded-md pl-3">
                  <li className={`w-full min-w-0 max-w-[275px] rounded-md cursor-pointer nav-link ${isActive('/configuration/models') ? 'bg-gray-500 dark:bg-gray-700 text-white' : ''}`}>
                    <Link
                      to="/configuration/models"
                      className="pl-2 flex items-center min-w-0 w-full"
                      onClick={() => handleSetSelectedReportIndex(null)}
                    >
                      <span className="material-icons scale-75">auto_awesome</span>
                      <span className="truncate" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Model Settings
                      </span>
                    </Link>
                  </li>
                  <li className={`w-full min-w-0 max-w-[275px] rounded-md cursor-pointer nav-link ${isActive('/configuration/rss') ? 'bg-gray-500 dark:bg-gray-700 text-white' : ''}`}>
                    <Link
                      to="/configuration/rss"
                      className="pl-2 flex items-center min-w-0 w-full"
                      onClick={() => handleSetSelectedReportIndex(null)}
                    >
                      <span className="material-icons scale-75">rss_feed</span>
                      <span className="truncate" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        RSS Settings
                      </span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>
        {!isCollapsed && (
          <div className="m-3 flex justify-center">
            <span className="copyright-box dark:text-neutralc-300 text-sm">Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Drawer;   
