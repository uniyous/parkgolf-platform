export const randomText = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const generateTimeBasedKey = (length = 8): string => {
  const timestamp = Date.now().toString(36); // 현재 시간을 36진수 문자열로 변환
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < length; i++) {
    randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `${timestamp}${randomPart}`; // 예: 'l7flsjhf-AbCd1234'
};

export const booleanify = (value: string): boolean => {
  const truthy: string[] = ['true', '1'];
  return truthy.includes(value.trim().toLowerCase());
};
