'use client';

import React, { type ChangeEvent, type HTMLInputTypeAttribute } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FormInputProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: HTMLInputTypeAttribute | 'textarea';
  children?: React.ReactNode; // For icons or prefixes
  required?: boolean;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  children,
  required = true,
  className = '',
  inputClassName = '',
  labelClassName = '',
}) => (
  <div className={`space-y-1 ${className}`}>
    <Label
      htmlFor={name}
      className={`block text-right text-sm font-medium ${labelClassName}`}
    >
      {label}
      {required && <span className='mr-1 text-destructive'>*</span>}
    </Label>
    <div className='relative flex items-center'>
      {children && (
        <div className='pointer-events-none absolute right-3 top-1/2 flex h-full -translate-y-1/2 items-center'>
          {children}
        </div>
      )}
      {type === 'textarea' ? (
        <Textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full text-right ${children ? 'pr-10' : ''} ${inputClassName}`}
          required={required}
          rows={3}
        />
      ) : (
        <Input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full text-right ${children ? 'pr-10' : ''} ${inputClassName}`}
          required={required}
        />
      )}
    </div>
  </div>
);

export default FormInput;
