import React, { useEffect, useState } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChangeValue: (value: number) => void;
  prefixStr?: string;
}

export function CurrencyInput({ value, onChangeValue, prefixStr = 'R$ ', className, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // Convert current numeric value to string without separator, e.g., 12.5 -> "1250"
    // Handle floating point precision issues properly
    const numStr = Math.round(value * 100).toString();
    setDisplayValue(formatNumericString(numStr, prefixStr));
  }, [value, prefixStr]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Extract only digits
    const digits = rawValue.replace(/\D/g, '');
    
    if (digits === '') {
      onChangeValue(0);
      return;
    }
    
    const numericValue = parseInt(digits, 10) / 100;
    onChangeValue(numericValue);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
}

function formatNumericString(digits: string, prefix: string) {
  // Remove leading zeros
  digits = digits.replace(/^0+/, '');
  
  // Pad with zeros to ensure at least 3 digits (e.g., '1' -> '001')
  digits = digits.padStart(3, '0');
  
  const integerPart = digits.slice(0, -2);
  const decimalPart = digits.slice(-2);
  
  // Add thousand separators
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${prefix}${formattedInteger},${decimalPart}`;
}
