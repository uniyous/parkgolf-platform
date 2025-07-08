module.exports = {
  // 기본 포맷팅 규칙
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  
  // 줄바꿈 관련
  endOfLine: 'lf',
  
  // 괄호 관련
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  
  // 특정 파일 타입별 설정
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200,
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
  ],
};