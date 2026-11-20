"use client";


export interface MeterConfig {
  serviceId: string;
  prefix: string;
  postfix: string;
  installedAt: string;
}

export interface BulkMetersValues {
  unitIds: string[];
  meters: MeterConfig[];
}
