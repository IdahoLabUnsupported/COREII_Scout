import React, { forwardRef, useImperativeHandle } from 'react';
import { useDeleteSourceMutation } from '../../../app/services/client.ts';
import { RootState } from '../../../app/store/index.ts';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

type Props = {
  onClose?: () => void;
  showFormButtons?: boolean;
  data?: any;
};

export interface FormEditSourceDeleteHandles {
  deleteSource: () => void;
}

const FormEditSourceDelete = forwardRef<FormEditSourceDeleteHandles, Props>(({ onClose, showFormButtons = true, data }, ref) => {

  const [deleteSource, { isLoading, isSuccess, isError, data: deleteData }] = useDeleteSourceMutation();
  const selectDerivedReportId = (state: RootState) => state.reportId.reportId;

  const selectResultData = createSelector(
    [selectDerivedReportId],
    (currentDerivedReportId) => ({
      currentDerivedReportId
     
    })
  );
  //const { currentDerivedReportId } = useSelector(selectResultData);

  const currentDerivedReportId: any = useSelector((state: RootState) => state.reportId.reportId);
  console.log("STATE", (state: any) => state.reportId);
  useImperativeHandle(ref, () => ({
    deleteSource() {
      handleDeleteSource();
    }
  }));

  const handleDeleteSource = () => {
    console.log('DATA', data);
    console.log("currentDerivedReportId", currentDerivedReportId, data.id);
    // Update the result object with the source edits
    deleteSource({ sourceId: data.id, reportId: currentDerivedReportId, _id: data._id }).unwrap();
    console.log('Deleting source', data._id);
    if (onClose) onClose();
  };

  return (
    <div>
      <p>Are you sure you want to delete "<span className="font-bold">{data.title}</span>"? This action cannot be undone.</p>
    </div>
  );
});

export default FormEditSourceDelete;
