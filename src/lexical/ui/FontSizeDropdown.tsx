import React, { useEffect, useRef, useState } from 'react';

type Props = {
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  defaultValue?: string;
};

export const FontSizeDropdown: React.FC<Props> = ({
  options,
  placeholder = '',
  onChange,
  defaultValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(defaultValue || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultValue !== undefined && defaultValue !== inputValue) {
      setInputValue(defaultValue);
    }
  }, [defaultValue, inputValue]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (value: string) => {
    setInputValue(value);
    setIsOpen(false);
    onChange(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsOpen(false);
      onChange(inputValue);
      e.preventDefault();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <div
      className='relative border border-gray-300 rounded-md px-1 focus:border-primary-300'
      ref={containerRef}
    >
      <input
        ref={inputRef}
        type='number'
        value={inputValue}
        onFocus={() => {
          setIsOpen(true);
        }}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className='w-8 h-full border-none outline-none text-sm text-center'
      />
      {isOpen && (
        <ul className='absolute z-10 mt-1 min-w-[60px] bg-white border border-gray-300 rounded-md shadow-md h-fit overflow-y-auto'>
          {options.length > 0 ? (
            options.map((option) => (
              <li
                key={option}
                onClick={() => handleSelect(option)}
                className='px-3 py-1 text-sm cursor-pointer hover:bg-blue-100 text-center'
              >
                {option}
              </li>
            ))
          ) : (
            <li className='px-3 py-1 text-xs text-gray-400 italic'>Custom value</li>
          )}
        </ul>
      )}
    </div>
  );
};
