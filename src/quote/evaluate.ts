/**
 * A deliberately tiny arithmetic evaluator for dictated quantity expressions
 * like "(5.25 + 2.90 + 7.60) * 2.76".
 *
 * It handles only `+ - * / ( )` and decimal numbers — nothing else. No
 * identifiers, no function calls, no exponent, no `eval`. Anything outside that
 * grammar throws, so a malformed expression surfaces loudly instead of
 * silently producing a wrong number. Recursive-descent, left-associative.
 *
 * This is the calculator code owns. The schema's whole point is that the maths
 * is deterministic — so it lives here and is tested hard, never left to the LLM.
 */

type Token =
  | { t: "num"; v: number }
  | { t: "op"; v: "+" | "-" | "*" | "/" }
  | { t: "lparen" }
  | { t: "rparen" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ t: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ t: "rparen" });
      i++;
      continue;
    }
    if ((c >= "0" && c <= "9") || c === ".") {
      let j = i;
      while (j < input.length && ((input[j] >= "0" && input[j] <= "9") || input[j] === ".")) {
        j++;
      }
      const slice = input.slice(i, j);
      // Reject malformed numbers like "1.2.3" or a lone ".".
      if (!/^\d+(\.\d+)?$|^\.\d+$/.test(slice)) {
        throw new Error(`Invalid number "${slice}" in expression: ${input}`);
      }
      tokens.push({ t: "num", v: Number(slice) });
      i = j;
      continue;
    }
    throw new Error(`Unexpected character "${c}" in expression: ${input}`);
  }
  return tokens;
}

/**
 * Evaluate a dictated arithmetic expression to a raw (unrounded) number.
 * Rounding is the caller's job (see compute.ts) so the round-then-multiply
 * ordering stays in one place.
 */
export function evaluate(expression: string): number {
  const tokens = tokenize(expression);
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];

  function parseExpr(): number {
    let left = parseTerm();
    for (;;) {
      const tok = peek();
      if (tok?.t === "op" && (tok.v === "+" || tok.v === "-")) {
        pos++;
        const right = parseTerm();
        left = tok.v === "+" ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    for (;;) {
      const tok = peek();
      if (tok?.t === "op" && (tok.v === "*" || tok.v === "/")) {
        pos++;
        const right = parseFactor();
        if (tok.v === "/" && right === 0) {
          throw new Error(`Division by zero in expression: ${expression}`);
        }
        left = tok.v === "*" ? left * right : left / right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseFactor(): number {
    const tok = peek();
    if (tok === undefined) {
      throw new Error(`Unexpected end of expression: ${expression}`);
    }
    if (tok.t === "op" && tok.v === "-") {
      pos++;
      return -parseFactor();
    }
    if (tok.t === "op" && tok.v === "+") {
      pos++;
      return parseFactor();
    }
    if (tok.t === "lparen") {
      pos++;
      const inner = parseExpr();
      const close = peek();
      if (close?.t !== "rparen") {
        throw new Error(`Missing closing parenthesis in expression: ${expression}`);
      }
      pos++;
      return inner;
    }
    if (tok.t === "num") {
      pos++;
      return tok.v;
    }
    throw new Error(`Unexpected token in expression: ${expression}`);
  }

  const result = parseExpr();
  if (pos !== tokens.length) {
    throw new Error(`Trailing tokens in expression: ${expression}`);
  }
  if (!Number.isFinite(result)) {
    throw new Error(`Expression did not evaluate to a finite number: ${expression}`);
  }
  return result;
}
