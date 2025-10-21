// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.
export interface StixObject {
    type: string;
    spec_version: string;
    id: string;
    created: string;
    modified: string;
    entity?: string;
    value?: string;
    revoked: boolean;
    name: string;
  }
  
  export interface StixBundle {
    type: string;
    id: string;
    objects: StixObject[];
  }