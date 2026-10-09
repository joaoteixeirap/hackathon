import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

// I4: "Melhor lugar para chamadas" is a local Radar recommendation, not a
// superiority claim about the product. "primeiro nome" and "primeiro mês"
// describe data/chronology. Those phrases are the only documented exceptions.
const exceptions = [/melhor (?:local|lugar) para chamadas/gi, /primeiro (?:nome|mês)/gi];
const prohibited = /\b(?:melhor|primeiro)\b|(?:^|[^\p{L}])(?:único|exclusivo|inédito|revolucionário)(?=$|[^\p{L}])|nenhum concorrente/giu;
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir,e.name)) : /\.(?:tsx?|md)$/.test(e.name) ? [join(dir,e.name)] : []);
}
test("interface copy avoids novelty and superiority claims (I4)", () => {
  const violations: string[] = [];
  for (const file of [...files("src/app"), ...files("src/components"), "src/lib/survey.ts"]) {
    // Code comments cannot be shown in the interface.
    let content = readFileSync(file,"utf8").replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
    for (const exception of exceptions) content = content.replace(exception,"");
    const matches = content.match(prohibited);
    if (matches) violations.push(`${file}: ${matches.join(", ")}`);
  }
  expect(violations).toEqual([]);
});
