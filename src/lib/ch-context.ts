export type Tok =
  | { type: "word"; value: string }
  | { type: "dot" }
  | { type: "comma" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "space" }
  | { type: "other"; ch: string };

export function tokenize(sql: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++; continue;
    }
    if (c === "`") {
      let v = ""; i++;
      while (i < sql.length && sql[i] !== "`") v += sql[i++];
      i++;
      out.push({ type: "word", value: v });
      continue;
    }
    if (c === ".") { out.push({ type: "dot" }); i++; continue; }
    if (c === ",") { out.push({ type: "comma" }); i++; continue; }
    if (c === "(") { out.push({ type: "lparen" }); i++; continue; }
    if (c === ")") { out.push({ type: "rparen" }); i++; continue; }
    if (/[a-zA-Z_$\u0080-\ufffe]/.test(c)) {
      let v = "";
      while (i < sql.length && /[a-zA-Z0-9_$\u0080-\ufffe]/.test(sql[i])) v += sql[i++];
      out.push({ type: "word", value: v });
      continue;
    }
    out.push({ type: "other", ch: c }); i++;
  }
  return out;
}
