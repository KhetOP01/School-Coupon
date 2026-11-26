'use client';

interface StatusFilterButtonProps {
  label: string;
  value: number;
  bg: string;
  color: string;
  active: boolean;
  onClick: () => void;
}

export default function StatusFilterButton({
  label,
  value,
  bg,
  color,
  active,
  onClick,
}: StatusFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        background: bg,
        color,
        padding: '0.42rem 0.8rem',
        borderRadius: '10px',
        fontSize: '0.8rem',
        fontWeight: 700,
        border: active ? `1.5px solid ${color}` : '1.5px solid transparent',
        boxShadow: active ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}: {value}
    </button>
  );
}
