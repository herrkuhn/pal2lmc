// Shared golden-spec helper for golden.spec.ts and golden-multisystem.spec.ts:
// a single definition avoids the two specs' patterns drifting. Both specs
// compare the raw non-comment lines (header plus data), so hex case and
// header tokens stay significant.

// Drops blank lines so a trailing newline in either the generated or the
// official text never shows up as a spurious extra entry in the comparison.
export function dataLinesOf(text: string): string[] {
  return text.split('\n').filter((line) => line.length > 0 && !line.startsWith('#'));
}
