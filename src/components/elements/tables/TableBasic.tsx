// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';
import { useTheme } from '../../../contexts/useTheme';
import ProgressBarCellRenderer from './ProgressBarCellRenderer';
import CheckboxCellRenderer from './CheckboxCellRenderer';
import UrlFileCellRenderer from './UrlFileCellRenderer';
import DateCellRenderer from './DateCellRenderer';
import ActionCellRenderer from './ActionCellRenderer';
import RadioButtonCellRenderer from './RadioButtonCellRenderer';

interface TableBasicProps<T> {
  rowData: T[];
  colDefs: any[];
  enablePagination?: boolean;
  actionButtons?: any;
  columnResponsiveBreakpoints?: any[];
  mobileBreakpoint?: number;
  allowMobileView?: boolean;
  onRowClick?: (data: any) => void;
  selectedRowId?: number | null;
  components?: any;
  gridRef: React.RefObject<AgGridReact<T>>;
}

const TableBasic = <T extends { id: number }>({
  rowData,
  colDefs,
  enablePagination = false,
  actionButtons,
  columnResponsiveBreakpoints = [],
  mobileBreakpoint = 500,
  allowMobileView = true,
  onRowClick,
  selectedRowId, // Handle external selection
  components, // Add components prop
  gridRef, // Accept the gridRef prop
}: TableBasicProps<T> & { gridRef: React.RefObject<AgGridReact<T>> }) => {
  const { theme } = useTheme();
  const [visibleColDefs, setVisibleColDefs] = useState(colDefs);

  const handleRowClicked = useCallback(
    (event: any) => {
      if (onRowClick) {
        onRowClick(event.data); // Pass the row data to the parent via the onRowClick handler
      }
    },
    [onRowClick]
  );

  useEffect(() => {
    if (selectedRowId && gridRef?.current) {
      setTimeout(() => {
        const node = gridRef?.current?.api.getRowNode(selectedRowId.toString());
        if (node && node.rowIndex != null) {
          node.setSelected(true);
          gridRef?.current?.api.ensureIndexVisible(node.rowIndex);
        }
      }, 100); // Small delay to ensure the grid is updated
    }
  }, [selectedRowId, rowData, gridRef]);

  return (
    <div className={`ag-theme-material ${theme === 'dark' ? 'dark' : ''}`} style={{ width: '100%', height: '100%' }}>
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={visibleColDefs}
        pagination={enablePagination}
        paginationPageSize={10}
        rowSelection="single"
        suppressRowClickSelection={false}
        onRowClicked={handleRowClicked}
        domLayout="autoHeight"
        suppressAnimationFrame={true}
        components={{
          progressBarCellRenderer: ProgressBarCellRenderer,
          checkboxCellRenderer: CheckboxCellRenderer,
          urlFileCellRenderer: UrlFileCellRenderer,
          dateCellRenderer: DateCellRenderer,
          actionCellRenderer: (params: any) => <ActionCellRenderer {...params} buttons={actionButtons} />,
          radioButtonCellRenderer: RadioButtonCellRenderer, // Add the new cell renderer
          ...components, // Spread custom components
        }}
      />
    </div>
  );
};

export default TableBasic;
