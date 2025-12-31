import React from 'react';

interface Props { variant?: 'ai' | 'product' | 'general'; className?: string }

const ComplianceNotice: React.FC<Props> = ({ variant = 'general', className }) => {
  const base = 'text-[11px] leading-snug text-text-secondary';
  const cls = className ? `${base} ${className}` : base;
  if (variant === 'product') {
    return (
      <div className={cls}>
        风险提示：投资有风险，入市需谨慎。产品信息以金融机构官方披露为准，预期收益不代表实际收益，可能亏损本金。
      </div>
    );
  }
  if (variant === 'ai') {
    return (
      <div className={cls}>
        AI 生成内容仅供参考，请自行判断与核实；避免提交或展示含个人敏感信息的内容。
      </div>
    );
  }
  return (
    <div className={cls}>
      重要提示：AI 结果与产品信息仅供参考，不构成投资建议；请注意个人信息与隐私保护。
    </div>
  );
};

export default ComplianceNotice;
