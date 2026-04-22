// Button.jsx
// A reusable button component that supports different visual styles.
// Instead of writing className strings on every button, we centralise
// the styles here. The "variant" prop switches between styles.

export function Button({ children, variant = 'primary', onClick, type = 'button', className = '', disabled = false }) {

  // Each variant maps to the CSS classes we defined in index.css
  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  )
}