import 'server-only';

import { getAnalyticsControlState } from '@/lib/analytics-control';
import {
  buildMeasurementQualificationReport,
  createAsiaBangkokMeasurementWindow,
  type MeasurementControlState,
  type MeasurementQualificationStore,
} from '@/lib/measurement-qualification-report';
import { drizzleMeasurementQualificationStore } from '@/lib/measurement-qualification-store';

export * from '@/lib/measurement-qualification-report';
export {
  createMeasurementQualificationStore,
  type MeasurementQualificationQueries,
  type PersistedMeasurementEventRow,
} from '@/lib/measurement-qualification-store';

export function createMeasurementQualificationService(input: {
  store: MeasurementQualificationStore;
  getControlState(): Promise<MeasurementControlState>;
  now?: () => Date;
}) {
  return {
    async getReport() {
      const observedAt = input.now?.() ?? new Date();
      const window = createAsiaBangkokMeasurementWindow(observedAt);
      const [snapshot, control] = await Promise.all([
        input.store.readSnapshot(window, observedAt),
        input.getControlState(),
      ]);
      return buildMeasurementQualificationReport({
        window,
        observedAt,
        control,
        ...snapshot,
      });
    },
  };
}

export const measurementQualificationService = createMeasurementQualificationService({
  store: drizzleMeasurementQualificationStore,
  async getControlState() {
    const state = await getAnalyticsControlState({ fresh: true });
    return {
      operationalEnabled: state.operationalEnabled,
      governanceApproved: state.governanceApproved,
      effectiveEventClasses: state.effectiveEventClasses,
      rawEventRetentionDays: state.governanceDecision?.rawEventRetentionDays ?? null,
    };
  },
});
