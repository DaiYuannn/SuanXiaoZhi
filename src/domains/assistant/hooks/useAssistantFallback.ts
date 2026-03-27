export const fallbackReply = (question: string): string => {
  if (question.includes("消费")) {
    return "当前处于降级模式：建议先查看本月高频支出分类并设置预算上限。";
  }

  return "当前处于降级模式：请稍后重试，或使用快捷入口继续记账。";
};