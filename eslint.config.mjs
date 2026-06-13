import next from 'eslint-config-next';

const eslintConfig = [
  ...next,
  {
    ignores: ['.next/**', 'node_modules/**', 'data/**'],
  },
  {
    rules: {
      // Mount-time localStorage reads (ported from the house onboarding/key
      // patterns) intentionally seed state in an effect; this rule is a perf
      // hint, not a correctness check, and the reads are one-shot on mount.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default eslintConfig;
