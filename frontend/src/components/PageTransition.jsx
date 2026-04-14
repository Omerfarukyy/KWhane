// src/components/PageTransition.jsx
// Zero-dependency page transition wrapper.
// Uses the `fadeUp` keyframe defined in index.css.
// Wrap each page's root element with this.

export default function PageTransition({ children, className = '' }) {
  return (
    <div className={`page-enter ${className}`}>
      {children}
    </div>
  )
}
