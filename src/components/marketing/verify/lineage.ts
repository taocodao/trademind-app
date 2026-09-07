/* SHA-256 checksums of the public proof-kit artifacts, pinned at the
   v1.0.0-public-audit tag of the harness repo. Rendered on /verify lineage
   section. Regenerate via scripts/build-ledger-data.mjs. */
export const ARTIFACT_SHA256: { file: string; sha256: string }[] = [
    { file: 'trademind-v4-ledger.csv', sha256: '926ee4bd518f56b7fad1a851297efee5c6a1be80af42a0520ae2f4c762ea23f9' },
    { file: 'trademind-v4-equity-curve.csv', sha256: 'ba135e4ab369a1b8aaa4f420e7cb24661721ff45f5f75c2f317a6d44eebdd6e0' },
    { file: 'trademind-v4-metrics.json', sha256: 'ec187a58047b00e587867f7dfaa423603ac2b84a0d253cd5a75feca93499225c' },
    { file: 'trademind-v4-config.json', sha256: 'c5fb9592e06eef3b7665fb5ca6cc2342be280250f31b00c8de94fa07c824cbdc' },
    { file: 'trademind-v4-ledger-detail.json', sha256: 'e9338bc11037eca59125e930bfe28d0df8520c7f1ff37e370e6990b4ba486765' },
];

export const HARNESS_COMMIT = '2937348';
export const HARNESS_TAG = 'v1.0.0-public-audit';
