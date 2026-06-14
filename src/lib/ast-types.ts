export type ExpressionNode =
  | { type: 'ref'; key: string }
  | { type: 'field'; name: string }
  | { type: 'literal'; value: string | number; dataType: string }
  | { type: 'call'; func: string; args: ExpressionNode[] }
  | { type: 'agg'; func: string; field: string }
