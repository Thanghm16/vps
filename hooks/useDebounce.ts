import { useState, useEffect } from 'react';

/**
 * useDebounce Hook
 * @param value Giá trị đầu vào cần debounce
 * @param delay Thời gian delay tính bằng milliseconds (mặc định 2000ms / 2s theo yêu cầu)
 * @returns Giá trị debounced sau khi người dùng dừng thao tác đủ thời gian delay
 */
export function useDebounce<T>(value: T, delay: number = 2000): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
