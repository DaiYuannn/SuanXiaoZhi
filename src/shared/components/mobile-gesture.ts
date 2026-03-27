import { getSwipeAction } from "../../domains/ledger/hooks/useSwipeTransaction.js";

export const detectGesture = (deltaX: number, deltaY: number): string => {
  if (deltaY > 56) {
    return "pull-to-refresh";
  }

  const swipe = getSwipeAction(deltaX);
  if (!swipe) {
    return "none";
  }

  return swipe.leftAction;
};