import React from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

interface TitleProps {
  text: string;
  children: React.ReactElement;
  className?: string;
}

// Este componente envuelve a cualquier otro y le añade el tooltip
export const Title = ({ text, children, className }: TitleProps) => {
  return (
    <Tippy content={text} arrow={true}>
      <span className={className}>{children}</span>
    </Tippy>
  );
};