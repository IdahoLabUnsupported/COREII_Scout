// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useMemo, useState, useEffect, useRef, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import TableBasic from './TableBasic';
import { AppReport, Source } from '../../../../app/types/types';
import { setSourceId } from '../../../../app/store/sourceIdReduxSlice';
import { setReportId } from '../../../../app/store/reportIdReduxSlice';
import StatusCellRendererWrapper from './StatusCellRendererWrapper';
import CheckboxCellRendererWrapper from './CheckboxCellRendererWrapper';
import OffCanvasDrawer from '../../../components/drawers/OffCanvasDrawer';

const FormEditSourceSave = React.lazy(() => import('../../forms/FormEditSourceSave'));
const FormEditSourceReprocess = React.lazy(() => import('../../forms/FormEditSourceReprocess'));
const FormEditSourceDelete = React.lazy(() => import('../../forms/FormEditSourceDelete'));
const FormArticleTopicExplorer = React.lazy(() => import('../../forms/FormArticleTopicExplorer'));

type LayoutSourcesProps = {
  reportSelected: AppReport;
  actionButtons?: any[];
  newSourceId?: string;
  onSourceSelect: (source: Source) => void;
};

const TableSourceList: React.FC<LayoutSourcesProps> = ({ reportSelected, actionButtons, newSourceId, onSourceSelect }) => {
  const dispatch = useDispatch();
  const formRef = useRef<any>(null);
  const gridRef = useRef<any>(null);

  const [selectedRowId, setSelectedRowId] = useState<number | undefined>(newSourceId ? parseInt(newSourceId) : undefined);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState(<span>Topic Explorer</span>);

  const enrichedSourceList = useMemo(() => (
    reportSelected.sourceList.map((source: any, index: number) => ({
      ...source,
      index: index + 1
    }))
  ), [reportSelected.sourceList]);

  useEffect(() => {
    dispatch(setReportId(reportSelected.id));
    if (newSourceId) {
      setSelectedRowId(parseInt(newSourceId));
      dispatch(setSourceId(parseInt(newSourceId)));
    }
  }, [newSourceId, reportSelected.id, dispatch]);

  useEffect(() => {
    if (selectedRowId !== undefined) {
      const selectedSource = enrichedSourceList.find((source: { id: number | undefined; }) => source.id === selectedRowId);
      setDrawerTitle(
        <span>
          Topic Explorer:
          <span className="bg-gray-700 text-white text-sm font-semibold mr-2 px-3 py-1.5 rounded-full ml-2">
            {selectedSource ? selectedSource.title : ''}
          </span>
        </span>
      );
    }
  }, [selectedRowId, enrichedSourceList]);

  const handleSave = () => formRef.current?.saveEditedSource();
  const handleReprocess = () => formRef.current?.reprocessSource();
  const handleDelete = () => formRef.current?.deleteSource();
  const topicSubmit = () => formRef.current?.topicSubmit();

  const dialogConfigs = useMemo(() => ({
    editSource: {
      title: 'Edit Source Info',
      submitButtonLabel: 'Save',
      dialogContent: <FormEditSourceSave ref={formRef} />,
      onSave: handleSave,
    },
    reprocessSource: {
      title: 'Reprocess Source',
      submitButtonLabel: 'Reprocess',
      dialogContent: <FormEditSourceReprocess ref={formRef} />,
      onSave: handleReprocess,
    },
    deleteSource: {
      title: 'Delete Source',
      submitButtonLabel: 'Delete',
      dialogContent: <FormEditSourceDelete ref={formRef} />,
      onSave: handleDelete,
    },
  }), []);

  const defaultActionButtons = useMemo(() => [
    {
      buttonLabel: 'Edit Source Info',
      buttonIcon: 'info',
      buttonColor: 'btn-ghost',
      buttonSize: 'btn-sm',
      ...dialogConfigs.editSource,
    },
    {
      buttonLabel: 'Reprocess Source',
      buttonIcon: 'refresh',
      buttonColor: 'btn-ghost',
      buttonSize: 'btn-sm',
      ...dialogConfigs.reprocessSource,
    },
    {
      buttonLabel: 'Delete Source',
      buttonIcon: 'delete',
      buttonColor: 'btn-ghost',
      buttonSize: 'btn-sm',
      ...dialogConfigs.deleteSource,
    },
    {
      buttonLabel: 'Topic Explorer',
      buttonIcon: 'hub',
      buttonColor: 'btn-ghost',
      buttonSize: 'btn-sm',
      onClick: () => {
        setIsDrawerOpen(true);
      },
    },
  ], [dialogConfigs]);

  const handleRowClick = (rowData: Source) => {
    if (rowData?.id) {
      setSelectedRowId(rowData.id);
      dispatch(setSourceId(rowData.id));
      onSourceSelect(rowData);
    }
  };

  return (
    <>
      {enrichedSourceList.length > 0 ? (
        <TableBasic<Source>
          rowData={enrichedSourceList}
          gridRef={gridRef}
          colDefs={[
            { headerName: '#', field: 'index', width: 60 },
            { headerName: 'Source Name', field: 'title', flex: 2 },
            { 
              headerName: 'Progress', 
              field: 'status', 
              flex: 1.0, 
              cellRenderer: 'statusCellRendererWrapper', 
              cellRendererParams: (params: any) => ({ sourceId: params.data.id.toString() }) 
            },
            { headerName: 'Date', field: 'createdOn', width: 110, cellRenderer: 'dateCellRenderer' },
            { headerName: 'Actions', field: 'actions', cellRenderer: 'actionCellRenderer', width: 175, valueFormatter: () => ''},
            { 
              headerName: 'Include', 
              field: 'checkbox', 
              width: 100,   
              cellRenderer: 'checkboxCellRendererWrapper',
              cellRendererParams: (params: any) => ({ sourceId: params.data.id.toString() })   
            }
          ]}
          enablePagination={false}
          actionButtons={actionButtons || defaultActionButtons}
          mobileBreakpoint={600}
          allowMobileView={false}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          components={{
            statusCellRendererWrapper: StatusCellRendererWrapper,
            checkboxCellRendererWrapper: CheckboxCellRendererWrapper,
          }}
        />
      ) : (
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-500">No sources available</p>
        </div>
      )}

      <OffCanvasDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerTitle}
        onSubmit={topicSubmit}
      >
        <FormArticleTopicExplorer ref={formRef} />
      </OffCanvasDrawer>
    </>
  );
};

export default TableSourceList;