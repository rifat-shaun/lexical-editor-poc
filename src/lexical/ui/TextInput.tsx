/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import * as React from 'react';
import { HTMLInputTypeAttribute } from 'react';

import './Input.css';

type Props = Readonly<{
  'data-test-id'?: string;
  label: string;
  onChange: (val: string) => void;
  placeholder?: string;
  value: string;
  type?: HTMLInputTypeAttribute;
}>;

export default function TextInput({
  label,
  value,
  onChange,
  placeholder = '',
  'data-test-id': dataTestId,
  type = 'text',
}: Props) {
  return (
    <div className='Input__wrapper w-44'>
      <label className='Input__label'>{label}</label>
      <input
        type={type}
        className='Input__input'
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onClick={(e) => e.stopPropagation()}
        data-test-id={dataTestId}
      />
    </div>
  );
}
