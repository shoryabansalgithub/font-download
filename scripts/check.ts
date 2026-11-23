let passed = 0;
let failed = 0;

export function check(label: string, actual: unknown, expected: unknown) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson === expectedJson) {
        passed++;
        console.log(`  pass  ${label}`);
        return;
    }
    failed++;
    console.log(`  FAIL  ${label}`);
    console.log(`        expected ${expectedJson}`);
    console.log(`        actual   ${actualJson}`);
}

export function finish() {
    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}
