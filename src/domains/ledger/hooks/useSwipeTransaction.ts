export interface SwipeAction {
  leftAction: "delete" | "edit";
}

export const getSwipeAction = (deltaX: number): SwipeAction | null => {
  if (deltaX < -48) {
    return { leftAction: "delete" };
  }
  if (deltaX > 48) {
    return { leftAction: "edit" };
  }
  return null;
};