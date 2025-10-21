import React, { forwardRef, useImperativeHandle } from 'react';
import { useReprocessSourceMutation } from '../../../app/services/client';

type Props = {
  onClose?: () => void;
  showFormButtons?: boolean;
  data?: any;
};

export interface FormEditSourceReprocessHandles {
  reprocessSource: () => void;
}

const FormEditSourceReprocess = forwardRef<FormEditSourceReprocessHandles, Props>(({ onClose, showFormButtons = true, data }, ref) => {
  
  const [reprocessSource, { isLoading, isError, isSuccess }] = useReprocessSourceMutation();

  useImperativeHandle(ref, () => ({
    reprocessSource() {
      handleReprocessSource();
    }
  }));

  const handleReprocessSource = async () => {
    console.log('Reprocessing source', data);
    await reprocessSource({ id: data._id, source: data }).unwrap();
    if (onClose) onClose();
  };

  return (
    <div>
      <p>Are you sure you want to reprocess "<span className="font-bold">{data.title}</span>"? Previous work could be lost.</p>
    </div>
  );
});

export default FormEditSourceReprocess;
