import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';
import { fetchIncentives, claimIncentive } from '../api/incentives-api';
import type { IncentiveItem } from '../../../shared/types/api';
import { auditUI, auditApi, auditError } from '../../../shared/audit/audit-service';

const IncentiveCenterPage: React.FC = () => {
  const [items, setItems] = useState<IncentiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '算小智 - 激励中心';
    return () => { document.title = originalTitle; };
  }, []);

  useEffect(() => {
    setLoading(true);
    auditApi('incentives_load_start');
    fetchIncentives()
      .then(res => {
        setItems(res.data || []);
        auditApi('incentives_load_success', { count: res.data?.length || 0 });
      })
      .catch(e => {
        const msg = e?.message || '加载失败';
        setError(msg);
        auditError('incentives_load_fail', e);
      })
      .finally(() => setLoading(false));
  }, []);

  const onClaim = async (id: string) => {
    setClaiming(id);
    auditUI('incentive_claim_click', { id });
    try {
      await claimIncentive(id);
      setItems(list => list.map(it => it.id === id ? { ...it, status: 'CLAIMED' } : it));
      auditApi('incentive_claim_success', { id });
    } catch (e) {
      auditError('incentive_claim_fail', e);
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-1">激励中心</h2>
              <nav className="text-sm text-text-secondary">
                <span>激励中心</span>
              </nav>
            </div>
          </div>
        </div>

        <section>
          <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
            {loading && <div className="text-center text-text-secondary">加载中...</div>}
            {error && <div className="text-center text-danger">{error}</div>}
            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(it => (
                  <div key={it.id} className="bg-white rounded-xl border border-border-light p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-text-primary">{it.title}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${it.status === 'CLAIMED' ? 'bg-success bg-opacity-20 text-success' : 'bg-info bg-opacity-20 text-info'}`}>
                        {it.status === 'CLAIMED' ? '已领取' : '可领取'}
                      </span>
                    </div>
                    {it.description && <div className="text-xs text-text-secondary mb-3">{it.description}</div>}
                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span>奖励：{it.reward || `${it.points} 积分`}</span>
                      <button
                        disabled={it.status === 'CLAIMED' || claiming === it.id}
                        className={`px-3 py-1 rounded ${it.status === 'CLAIMED' ? 'bg-gray-200' : 'bg-primary text-white'} disabled:opacity-50`}
                        onClick={() => onClaim(it.id)}
                      >
                        {it.status === 'CLAIMED' ? '已领取' : (claiming === it.id ? '领取中...' : '领取')}
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="col-span-full text-center text-text-secondary text-sm">暂无可领取的激励</div>}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default IncentiveCenterPage;





