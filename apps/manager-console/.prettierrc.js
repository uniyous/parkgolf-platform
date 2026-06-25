/** @type {import("prettier").Config} */
export default {
  plugins: ["prettier-plugin-tailwindcss"],
  semi: true, // 세미콜론 사용 여부
  singleQuote: true, // 작은따옴표 사용 여부
  tabWidth: 2, // 탭 너비
  trailingComma: 'all', // 후행 쉼표 사용 방식
  printWidth: 140, // 한 줄의 최대 길이
  arrowParens: 'always', // 화살표 함수에서 괄호 사용 방식
};