// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import Quill from 'quill';
import ReactDOM from 'react-dom/client';
import CustomTooltipModuleLayout from './CustomTooltipModuleLayout';

const Tooltip = Quill.import('ui/tooltip') as unknown as { new (quill: Quill, bounds: any): any };
const Module = Quill.import('core/module') as unknown as { new (quill: Quill, options: any): any };

class CustomTooltipClass extends Tooltip {
  quill: Quill;
  root: HTMLElement;
  reactRoot: ReactDOM.Root | null = null;

  constructor(quill: Quill, options: any) {
    super(quill, options.bounds);
    this.quill = quill;
    this.root = document.createElement('div');
    this.root.classList.add('custom-tooltip');
    this.quill.container.appendChild(this.root);
  }

  show(
    range: { index: number; length: number },
    label: string,
    confidence: number,
    tramStatus: string,
    getSelectTramStatusOptions: { label: string; value: string }[],
    getSelectEntityLabelOptions: { label: string; value: string }[],
    handleTramStatusChange: (e: React.ChangeEvent<HTMLSelectElement>, predictionIndex: number) => void,
    getSelectColorTramStatus: (status: string) => string,
    handleEntityLabelChange: (e: React.ChangeEvent<HTMLSelectElement>, predictionIndex: number) => void,
    predictionIndex: number,
    position: { left: number; top: number },
    text: string
  ) {
    if (this.reactRoot) {
      this.reactRoot.unmount();
    }

    this.reactRoot = ReactDOM.createRoot(this.root);

    this.reactRoot.render(
      <CustomTooltipModuleLayout
        label={label}
        confidence={confidence}
        tramStatus={tramStatus}
        getSelectTramStatusOptions={getSelectTramStatusOptions}
        getSelectEntityLabelOptions={getSelectEntityLabelOptions}
        handleTramStatusChange={handleTramStatusChange}
        handleEntityLabelChange={handleEntityLabelChange} // Pass the new handler here
        getSelectColorTramStatus={getSelectColorTramStatus}
        onClose={() => this.hide()}
        position={position}
        visible={true}
        index={predictionIndex}
        text={text}
      />
    );

    this.root.classList.add('!visible');
  }

  hide() {
    this.root.classList.remove('!visible');

    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }

    this.root.innerHTML = '';
  }
}

class CustomTooltipModule extends Module {
  quill: Quill;
  tooltip: CustomTooltipClass;
  getSelectTramStatusOptions: { label: string; value: string }[];
  getSelectEntityLabelOptions: { label: string; value: string }[];

  constructor(quill: Quill, options: any) {
    super(quill, options);
    this.quill = quill;
    this.tooltip = new CustomTooltipClass(this.quill, options);
    this.getSelectTramStatusOptions = options.getSelectTramStatusOptions || [];
    this.getSelectEntityLabelOptions = options.getSelectEntityLabelOptions || [];

    this.quill.on('text-change', () => {
      this.tooltip.hide();
    });
  }

  showTooltip(
    range: { index: number, length: number },
    label: string,
    confidence: number,
    tramStatus: string,
    getSelectTramStatusOptions: { label: string; value: string }[],
    getSelectEntityLabelOptions: { label: string; value: string }[],
    handleTramStatusChange: (e: React.ChangeEvent<HTMLSelectElement>, predictionIndex: number) => void,
    getSelectColorTramStatus: (status: string) => string,
    handleEntityLabelChange: (e: React.ChangeEvent<HTMLSelectElement>, predictionIndex: number) => void,
    predictionIndex: number,
    text: string
  ) {
    const bounds = this.quill.getBounds(range.index, range.length);
    if (!bounds) return;

    const quillBounds = this.quill.container.getBoundingClientRect();

    const tooltipMinWidth = 350;
    const tooltipMaxHeight = 300;
    const marginRight = 20;

    let left = bounds.left;
    let top = bounds.top + bounds.height;

    if (left + tooltipMinWidth > quillBounds.width - marginRight) {
      left = quillBounds.width - tooltipMinWidth - marginRight;
    }

    if (left < 0) {
      left = 0;
    }

    if (top + tooltipMaxHeight > quillBounds.height) {
      top = bounds.top - tooltipMaxHeight;
      if (top < 0) {
        top = quillBounds.height - tooltipMaxHeight;
      }
    }

    if (top < 0) {
      top = 0;
    }

    const position = { left, top };

    this.tooltip.show(
      range,
      label,
      confidence,
      tramStatus,
      getSelectTramStatusOptions,
      getSelectEntityLabelOptions,
      handleTramStatusChange,
      getSelectColorTramStatus,
      handleEntityLabelChange,
      predictionIndex,
      position,
      text
    );
  }

  hideTooltip() {
    this.tooltip.hide();
  }
}

Quill.register('modules/customTooltipUnique', CustomTooltipModule);

export default CustomTooltipModule;
