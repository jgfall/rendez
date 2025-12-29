'use client';

import { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-sand-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-xl
            bg-white border-2 border-sand-200
            text-sand-900 placeholder:text-sand-400
            transition-all duration-200
            focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10
            disabled:bg-sand-50 disabled:cursor-not-allowed
            ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-sm text-sand-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-danger-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

// Textarea component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-sand-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-xl
            bg-white border-2 border-sand-200
            text-sand-900 placeholder:text-sand-400
            transition-all duration-200
            focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10
            disabled:bg-sand-50 disabled:cursor-not-allowed
            resize-none
            ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-sm text-sand-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-danger-500">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };

// Select component
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-sand-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-xl
            bg-white border-2 border-sand-200
            text-sand-900
            transition-all duration-200
            focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10
            disabled:bg-sand-50 disabled:cursor-not-allowed
            appearance-none bg-no-repeat bg-right
            ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10' : ''}
            ${className}
          `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b5041' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1.25em 1.25em',
            paddingRight: '2.5rem',
          }}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1.5 text-sm text-danger-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };

