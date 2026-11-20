import firebaseSecurityRules from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'android/**/*'],
  },
  {
    files: ['**/*.rules'],
    languageOptions: {
      parser: firebaseSecurityRules.parser,
    },
    plugins: {
      '@firebase/security-rules': firebaseSecurityRules,
    },
    rules: {
      ...firebaseSecurityRules.configs.recommended.rules,
    },
  },
];
