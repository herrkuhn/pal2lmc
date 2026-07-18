// Shared golden-spec helpers for golden.spec.ts and golden-multisystem.spec.ts:
// a single definition avoids the two specs' patterns drifting.
// Byte-identity assertions compare the raw line strings dataLinesOf returns,
// so hex case stays significant there even though dataEntriesOf's selection
// pattern tolerates both cases (needed for the uppercase TIA_2600.lmc pair).

const DATA_LINE_PATTERN = /^[0-9a-fA-F]{6}(,[0-9a-fA-F]{6})*$/;

export function dataLinesOf(text: string): string[] {
  return text.split('\n').filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function dataEntriesOf(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => DATA_LINE_PATTERN.test(line))
    .join(',')
    .split(',');
}
