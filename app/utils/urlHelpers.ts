// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

export function toUrlFriendly(title: string): string {
  return title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
}
  