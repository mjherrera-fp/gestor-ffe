import React from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

interface TitleProps {
  text: string;
  children: React.ReactElement;
}

// Este componente envuelve a cualquier otro y le añade el tooltip
export const Title = ({ text, children }: TitleProps) => {
  return (
    <Tippy content={text} arrow={true}>
      <span>{children}</span>
    </Tippy>
  );
};