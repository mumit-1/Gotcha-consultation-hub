import { forwardRef } from 'react'

/**
 * Neo-brutalist Button
 * variant: 'primary' | 'secondary' | 'outline' | 'black' | 'muted'
 * size:    'sm' | 'md' | 'lg'
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size    = 'md',
    full    = false,
    loading = false,
    children,
    className = '',
    disabled,
    ...props
  },
  ref
) {
  const variantClass = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    outline:   'btn-outline',
    black:     'btn-black',
    muted:     'btn-muted',
    danger:    'btn bg-neo-accent text-white shadow-neo-sm hover:bg-red-600',
  }[variant] || 'btn-primary'

  const sizeClass = { sm: 'btn-sm', md: '', lg: 'btn-lg' }[size] || ''

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        ${variantClass} ${sizeClass}
        ${full ? 'w-full' : ''}
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed active:translate-x-0 active:translate-y-0 active:shadow-neo-sm' : ''}
        ${className}
      `.trim()}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  )
})

export default Button
