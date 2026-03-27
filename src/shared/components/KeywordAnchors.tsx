import React, { useEffect, useRef } from 'react';

export interface KeywordAnchorsProps {
  keywords: string[];               // 需要高亮的关键词
  scrollBehavior?: 'smooth' | 'auto';
  onAnchorClick?: (kw: string) => void;
  className?: string;
  children: React.ReactNode;       // 原始文本或包含的元素
}

// 简单文本高亮组件：遍历子节点中的文本，替换关键词为 span，可点击滚动到第一个出现位置
export const KeywordAnchors: React.FC<KeywordAnchorsProps> = ({ keywords, children, scrollBehavior = 'smooth', onAnchorClick, className }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 在挂载后为每个高亮 span 设置 id 便于滚动
    if (!rootRef.current) return;
    const spans = rootRef.current.querySelectorAll('[data-kw]');
    spans.forEach((el, idx) => {
      const kw = el.getAttribute('data-kw');
      if (kw && !el.id) {
        el.id = `kw-${kw}-${idx}`;
      }
    });
  }, [keywords, children]);

  const handleClick = (kw: string) => {
    const target = rootRef.current?.querySelector(`[data-kw='${kw}']`);
    if (target) {
      target.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
    }
    onAnchorClick?.(kw);
  };

  // 将 children 转换为包含高亮的 React 节点（仅处理纯文本及其直接子节点的文本）
  const transformNode = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === 'string') {
      let parts: React.ReactNode[] = [node];
      keywords.forEach(kw => {
        const newParts: React.ReactNode[] = [];
        parts.forEach(p => {
          if (typeof p !== 'string') { newParts.push(p); return; }
          const split = p.split(new RegExp(`(${kw})`, 'gi'));
          split.forEach(seg => {
            if (seg.toLowerCase() === kw.toLowerCase()) {
              newParts.push(
                <span
                  key={Math.random()}
                  data-kw={kw}
                  className="bg-primary/10 text-primary font-medium px-1 rounded cursor-pointer hover:bg-primary/20"
                  onClick={() => handleClick(kw)}
                >{seg}</span>
              );
            } else {
              newParts.push(seg);
            }
          });
        });
        parts = newParts;
      });
      return parts;
    }
    if (Array.isArray(node)) return node.map(transformNode);
    if (React.isValidElement(node)) {
      const anyNode: any = node; // 访问 props 时进行宽松类型断言
      return React.cloneElement(node, {}, transformNode(anyNode.props?.children));
    }
    return node;
  };

  return <div ref={rootRef} className={className}>{transformNode(children)}</div>;
};

export default KeywordAnchors;
