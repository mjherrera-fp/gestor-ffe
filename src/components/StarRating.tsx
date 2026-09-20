import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const sizeCls = sizeMap[size];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= Math.round(value);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star === value && star === 1 ? 0 : star === value ? star : star)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-colors ${
              readonly ? '' : 'hover:scale-110'
            }`}
          >
            <Star
              className={`${sizeCls} transition-all ${
                filled
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-text-muted fill-transparent'
              }`}
            />
          </button>
        );
      })}
      {!readonly && value !== undefined && (
        <span className="ml-1.5 text-xs font-bold text-text-muted">
          {value > 0 ? value.toFixed(1) : ''}
        </span>
      )}
    </div>
  );
}
