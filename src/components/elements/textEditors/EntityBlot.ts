// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import Quill from 'quill';
import Parchment from 'parchment';

const Inline = Quill.import('blots/inline') as typeof Parchment.Inline;

class EntityBlot extends Inline {
  static blotName = 'entity';
  static tagName = 'span';
  static className = 'entity-blot';
  static scope = Parchment.Scope.INLINE_BLOT;

  static create(value: { id: number; text: string }): HTMLElement {
    const node = super.create(value) as HTMLElement;
    node.setAttribute('data-entity-id', value.id.toString());
    node.style.position = 'relative';
    node.innerHTML = `<span class="absolute text-xs text-red-500" style="top: -1em; left: 0;">${value.id}</span>${value.text}`;
    return node;
  }

  static formats(node: HTMLElement) {
    return {
      id: parseInt(node.getAttribute('data-entity-id') || '0', 10),
      text: node.innerText.replace(/^\d+\s*/, ''),
    };
  }

  format(name: string, value: { id: number; text: string }) {
    if (name === 'entity' && value) {
      (this as any).domNode.setAttribute('data-entity-id', value.id.toString());
      (this as any).domNode.style.position = 'relative';
      (this as any).domNode.innerHTML = `<span class="absolute text-xs text-red-500" style="top: -1em; left: 0;">${value.id}</span>${value.text}`;
    } else {
      super.format(name, value);
    }
  }

  static value(node: HTMLElement) {
    return {
      id: parseInt(node.getAttribute('data-entity-id') || '0', 10),
      text: node.innerText.replace(/^\d+\s*/, ''),
    };
  }
}

Quill.register('formats/entity', EntityBlot);

export default EntityBlot;
