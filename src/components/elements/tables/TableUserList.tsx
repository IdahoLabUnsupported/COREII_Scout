// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import TableBasic from './TableBasic';
import { AppReport, UserRole } from '../../../../app/types/types';
import { setUserId } from '../../../../app/store/userIdReduxSlice';
import { setReportId } from '../../../../app/store/reportIdReduxSlice';
import { User } from '../../../../app/types/types';

const FormEditUserSave = React.lazy(() => import('../../forms/FormEditUserSave'));
const FormEditUserDelete = React.lazy(() => import('../../forms/FormEditUserDelete'));


type LayoutUserProps = {
  reportSelected: AppReport;
  actionButtons?: any[];
  newUserId?: string;
  onUserSelect: (user: UserRole) => void;
  users?: User[]; // Adjusted to match the User schema
};

const TableUserList: React.FC<LayoutUserProps> = ({ reportSelected, actionButtons, newUserId, onUserSelect, users }) => {
  const dispatch = useDispatch();
  const formRef = useRef<any>(null);
  const gridRef = useRef<any>(null); // Initialize gridRef here
  const [selectedRowId, setSelectedRowId] = useState<number | undefined>(newUserId ? parseInt(newUserId) : undefined);

  useEffect(() => {
    dispatch(setReportId(reportSelected.id));
    if (newUserId) {
      setSelectedRowId(parseInt(newUserId));
      dispatch(setUserId(parseInt(newUserId)));
    }
  }, [newUserId, reportSelected.id, dispatch]);

  const handleSave = () => formRef.current?.saveEditedSource();
  const handleReprocess = () => formRef.current?.reprocessSource();
  const handleDelete = () => formRef.current?.deleteSource();

  const dialogConfigs = useMemo(() => ({
    editUser: {
      title: 'Edit Source Info',
      submitButtonLabel: 'Save',
      dialogContent: <FormEditUserSave ref={formRef} />,
      onSave: handleSave,
    },
    deleteUser: {
      title: 'Delete Source',
      submitButtonLabel: 'Delete',
      dialogContent: <FormEditUserDelete ref={formRef} />,
      onSave: handleDelete,
    },
  }), []);

  const defaultActionButtons = useMemo(() => [
    {
      buttonLabel: 'Edit Source Info',
      buttonIcon: 'info',
      buttonColor: 'btn-ghost',
      buttonSize: 'btn-sm'
      //...dialogConfigs.editUser,
    },
    {
      buttonLabel: 'Delete Source',
      buttonIcon: 'delete',
      buttonColor: 'btn-ghost',
      buttonSize: 'btn-sm'
     // ...dialogConfigs.deleteUser,
    },
  ], [dialogConfigs]);

  // Default user list
  const defaultUserList: User[] = [
    {
      id: 0,
      firstName: "Dominiqu",
      lastName: "Wise",
      email: "dominiqu.wise@example.com",
      scoutAdmin: true
    },
    {
      id: 1,
      firstName: "Don",
      lastName: "Donaldson",
      email: "don.donaldson@example.com",
      scoutAdmin: false
    },
    {
      id: 2,
      firstName: "Robin",
      lastName: "Lake",
      email: "robin.lake@example.com",
      scoutAdmin: false
    },
  ];

  // Use provided users or default to hardcoded user list
  const userlist = users || defaultUserList;

  const enrichedUserList = useMemo(() => (
    userlist.map((user: User, index: number) => ({
      ...user,
      id: index, // Assuming id is the index for now
      index: index + 1
    }))
  ), [userlist]);

  const handleRowClick = (rowData: UserRole) => {
    if (rowData?.id) {
      setSelectedRowId(rowData.id);
      dispatch(setUserId(rowData.id));
      onUserSelect(rowData);
    }
  };

  return (
    <>
      {enrichedUserList.length > 0 ? (
        <TableBasic<User>
          rowData={enrichedUserList}
          colDefs={[
            { headerName: '#', field: 'index', width: 60 },
            { headerName: 'First Name', field: 'firstName', flex: 1 },
            { headerName: 'Last Name', field: 'lastName', flex: 1 },
            { headerName: 'Email', field: 'email', flex: 2 },
            { headerName: 'Scout Admin', field: 'scoutAdmin', flex: 1, valueFormatter: ({ value }: { value: boolean }) => value ? 'Yes' : 'No' },
            { headerName: 'Actions', field: 'actions', cellRenderer: 'actionCellRenderer', width: 125, valueFormatter: () => '' },
          ]}
          enablePagination={false}
          actionButtons={actionButtons || defaultActionButtons}
          mobileBreakpoint={600}
          allowMobileView={false}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          gridRef={gridRef}
        />
      ) : (
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-500">No users available</p>
        </div>
      )}
    </>
  );
};

export default TableUserList;