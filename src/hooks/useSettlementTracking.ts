import { useState, useEffect, useCallback } from 'react';
import { NetSettlement } from '@/lib/games/settlement';

export type SettlementStatus = 'pending' | 'paid' | 'forgiven';

export interface TrackedSettlement extends NetSettlement {
  status: SettlementStatus;
  paidAt?: Date;
  notes?: string;
}

interface SettlementTrackingState {
  [roundId: string]: {
    [key: string]: { // key is `${fromPlayerId}-${toPlayerId}`
      status: SettlementStatus;
      paidAt?: string;
      notes?: string;
    };
  };
}

const STORAGE_KEY = 'settlement_tracking';

function getSettlementKey(settlement: NetSettlement): string {
  return `${settlement.fromPlayerId}-${settlement.toPlayerId}`;
}

function loadTrackingState(): SettlementTrackingState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveTrackingState(state: SettlementTrackingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Error handled
  }
}

export function useSettlementTracking(roundId: string | undefined, settlements: NetSettlement[]) {
  const [trackingState, setTrackingState] = useState<SettlementTrackingState>(loadTrackingState);

  // Load tracking state on mount
  useEffect(() => {
    setTrackingState(loadTrackingState());
  }, []);

  // Get tracked settlements with status
  const trackedSettlements: TrackedSettlement[] = settlements.map(settlement => {
    const key = getSettlementKey(settlement);
    const tracking = roundId ? trackingState[roundId]?.[key] : undefined;

    return {
      ...settlement,
      status: tracking?.status || 'pending',
      paidAt: tracking?.paidAt ? new Date(tracking.paidAt) : undefined,
      notes: tracking?.notes,
    };
  });

  // Mark a settlement as paid
  const markAsPaid = useCallback((settlement: NetSettlement, notes?: string) => {
    if (!roundId) return;

    const key = getSettlementKey(settlement);
    const newState = { ...trackingState };

    if (!newState[roundId]) {
      newState[roundId] = {};
    }

    newState[roundId][key] = {
      status: 'paid',
      paidAt: new Date().toISOString(),
      notes,
    };

    setTrackingState(newState);
    saveTrackingState(newState);
  }, [roundId, trackingState]);

  // Mark a settlement as forgiven
  const markAsForgiven = useCallback((settlement: NetSettlement, notes?: string) => {
    if (!roundId) return;

    const key = getSettlementKey(settlement);
    const newState = { ...trackingState };

    if (!newState[roundId]) {
      newState[roundId] = {};
    }

    newState[roundId][key] = {
      status: 'forgiven',
      paidAt: new Date().toISOString(),
      notes,
    };

    setTrackingState(newState);
    saveTrackingState(newState);
  }, [roundId, trackingState]);

  // Reset a settlement to pending
  const markAsPending = useCallback((settlement: NetSettlement) => {
    if (!roundId) return;

    const key = getSettlementKey(settlement);
    const newState = { ...trackingState };

    if (newState[roundId]?.[key]) {
      delete newState[roundId][key];
    }

    setTrackingState(newState);
    saveTrackingState(newState);
  }, [roundId, trackingState]);

  // Get summary stats
  const stats = {
    total: settlements.length,
    pending: trackedSettlements.filter(s => s.status === 'pending').length,
    paid: trackedSettlements.filter(s => s.status === 'paid').length,
    forgiven: trackedSettlements.filter(s => s.status === 'forgiven').length,
    totalAmount: settlements.reduce((sum, s) => sum + s.amount, 0),
    paidAmount: trackedSettlements
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + s.amount, 0),
    pendingAmount: trackedSettlements
      .filter(s => s.status === 'pending')
      .reduce((sum, s) => sum + s.amount, 0),
  };

  return {
    trackedSettlements,
    markAsPaid,
    markAsForgiven,
    markAsPending,
    stats,
  };
}
