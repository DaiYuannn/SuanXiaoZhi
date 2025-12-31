import { useEffect, useState } from 'react';
import { fetchUserProfile, fetchPlanProgress, type UserProfile, type PlanProgress } from '../api';

const LOCAL_PLANS_KEY = 'appliedPlans';
interface LocalPlan { goalId: string; progress: number; updatedAt: string }
function loadLocalPlans(): LocalPlan[] {
  try {
    const raw = localStorage.getItem(LOCAL_PLANS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function mergeProgress(remote: PlanProgress[]): PlanProgress[] {
  const locals = loadLocalPlans();
  if (!locals.length) return remote;
  const map = new Map(remote.map(r => [r.goalId, r]));
  for (const lp of locals) {
    const existing = map.get(lp.goalId);
    if (!existing || existing.updatedAt < lp.updatedAt) {
      map.set(lp.goalId, { goalId: lp.goalId, progress: lp.progress, updatedAt: lp.updatedAt });
    }
  }
  return Array.from(map.values()).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface UseUserAndProgressState {
  loading: boolean;
  error?: string;
  profile?: UserProfile;
  progress?: PlanProgress[];
}

export function useUserAndProgress(goalId?: string): UseUserAndProgressState {
  const [state, setState] = useState<UseUserAndProgressState>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setState(s => ({ ...s, loading: true, error: undefined }));
        const [p1, p2] = await Promise.all([
          fetchUserProfile(),
          fetchPlanProgress(goalId),
        ]);
        if (cancelled) return;
        const merged = mergeProgress(p2.data || []);
        setState({ loading: false, profile: p1.data, progress: merged });
      } catch (e: any) {
        if (cancelled) return;
        setState({ loading: false, error: e?.message || '加载失败' });
      }
    })();
    return () => { cancelled = true; };
  }, [goalId]);

  return state;
}
