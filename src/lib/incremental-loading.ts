export interface ResultWindowScrollState {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
}

export function shouldLoadNextResultWindow(
  state: ResultWindowScrollState,
  threshold = 160
): boolean {
  return state.scrollHeight - state.scrollTop - state.clientHeight <= threshold
}
