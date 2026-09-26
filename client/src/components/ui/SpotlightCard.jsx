import { useCallback } from 'react';
import { motion } from 'framer-motion';

/** Glass card with a soft radial highlight that follows the cursor. */
export default function SpotlightCard({ as = 'article', className = '', children, ...rest }) {
  const Component = motion[as];
  const onPointerMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <Component className={`card spotlight ${className}`} onPointerMove={onPointerMove} {...rest}>
      {children}
    </Component>
  );
}
