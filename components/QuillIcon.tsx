import React from 'react';

/**
 * Custom quill icon — a dip-pen writer's quill with split nib and ink drop.
 * Intentionally different from generic AI-quill / Lucide Feather:
 *   - Asymmetric vanes (longer on one side, like a real flight feather)
 *   - Visible barbule strands suggesting texture
 *   - Split calligraphy nib at the tip
 *   - Ink drop at the writing point
 */
const QuillIcon = ({
  className = '',
  size,
  strokeWidth = 1.5,
}: {
  className?: string;
  size?: number;
  strokeWidth?: number;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    {/* Main quill barrel — long diagonal from nib to tip */}
    <path d="M5 21 Q9 16 13 11 Q17 6 21 3" />

    {/* Long vane — sweeps wide to the right of the spine */}
    <path d="M21 3 C19 5 17 8 15 11 C13 14 11 16 9 18" strokeOpacity="0.9" />

    {/* Short vane — tighter, stays close left of the spine */}
    <path d="M21 3 C20 6 18 9 16 13 C14 16 12 18 10 19" strokeOpacity="0.65" />

    {/* Barbule strand 1 — mid-vane texture */}
    <path d="M17 7 L15 9" strokeOpacity="0.45" strokeWidth={strokeWidth * 0.75} />

    {/* Barbule strand 2 */}
    <path d="M14 11 L12 12.5" strokeOpacity="0.4" strokeWidth={strokeWidth * 0.75} />

    {/* Split nib — two fine lines diverging at the writing tip */}
    <path d="M5 21 L6.5 18.5" strokeWidth={strokeWidth * 0.9} />
    <path d="M5 21 L3.5 19" strokeWidth={strokeWidth * 0.9} />

    {/* Ink drop at tip */}
    <circle cx="4.75" cy="21.5" r="0.65" fill="currentColor" stroke="none" />
  </svg>
);

export default QuillIcon;
