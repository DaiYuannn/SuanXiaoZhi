import React, { useEffect, useState } from 'react';
import { fetchFamilyMembers, createFamily, inviteFamilyMember, fetchFamilyLedgers, fetchTransactions } from '../../api/endpoints';
import type { FamilyMember, LedgerInfo, TransactionItem } from '../../api/types';

const FamilyPage: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [ledgers, setLedgers] = useState<LedgerInfo[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'ledger'>('members');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const mRes = await fetchFamilyMembers();
      setMembers(mRes.data || []);
      if (mRes.data && mRes.data.length > 0) {
        const lRes = await fetchFamilyLedgers();
        setLedgers(lRes.data || []);
        if (lRes.data && lRes.data.length > 0) {
           // Load transactions for the first family ledger
           const txRes = await fetchTransactions({ ledgerId: lRes.data[0].id, page: 1, size: 10 });
           setTransactions(txRes.data.list || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!familyName) return;
    try {
      await createFamily(familyName);
      setShowCreate(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvite = async () => {
    try {
      const res = await inviteFamilyMember();
      setInviteCode(res.data.inviteCode);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      {members.length === 0 && !loading ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <h2 className="text-lg font-medium mb-4">您还没有加入任何家庭</h2>
          <button 
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            创建家庭
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex space-x-6 border-b border-border-light mb-6">
            <button 
              className={`pb-2 font-medium ${activeTab === 'members' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}
              onClick={() => setActiveTab('members')}
            >
              家庭成员
            </button>
            <button 
              className={`pb-2 font-medium ${activeTab === 'ledger' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}
              onClick={() => setActiveTab('ledger')}
            >
              共享账本
            </button>
          </div>

          {activeTab === 'members' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">成员列表</h2>
              <button 
                onClick={handleInvite}
                className="text-primary border border-primary px-4 py-1.5 rounded-lg hover:bg-primary-light transition-colors"
              >
                邀请成员
              </button>
            </div>
            
            {inviteCode && (
              <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-lg flex justify-between items-center">
                <span>邀请码：<span className="font-mono font-bold text-xl ml-2">{inviteCode}</span> (24小时有效)</span>
                <button onClick={() => setInviteCode(null)} className="text-sm opacity-60 hover:opacity-100">关闭</button>
              </div>
            )}

            <div className="grid gap-4">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-4 border border-border-light rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                      <i className="fas fa-user"></i>
                    </div>
                    <div>
                      <div className="font-medium">{m.username}</div>
                      <div className="text-xs text-text-secondary">{m.role === 'admin' ? '户主' : '成员'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {activeTab === 'ledger' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">家庭账本动态</h2>
                <span className="text-sm text-text-secondary">
                  {ledgers.length > 0 ? ledgers[0].name : '暂无账本'}
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">暂无家庭交易记录</div>
              ) : (
                <div className="space-y-4">
                  {transactions.map(t => (
                    <div key={t.transactionId} className="flex items-center justify-between p-4 border-b border-border-light last:border-0">
                      <div>
                        <div className="font-medium">{t.category || '未分类'}</div>
                        <div className="text-xs text-text-secondary">{t.time.split('T')[0]} {t.description}</div>
                      </div>
                      <div className={`font-bold ${t.type === 'EXPENSE' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'EXPENSE' ? '-' : '+'}{(t.amount / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">创建家庭</h3>
            <input
              type="text"
              placeholder="给家庭起个名字"
              className="w-full border border-border-light rounded-lg px-4 py-2 mb-4 focus:outline-none focus:border-primary"
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-text-secondary hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyPage;
