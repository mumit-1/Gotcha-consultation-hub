import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

/**
 * Wraps any content with a Framer Motion fade-up reveal on scroll.
 * Neo-brutalism: fast, snappy, not floaty.
 */
export default function AnimatedSection({
  children,
  className = '',
  delay = 0,
  direction = 'up', // 'up' | 'left' | 'right' | 'none'
  once = true,
}) {
  const [ref, inView] = useInView({ triggerOnce: once, threshold: 0.1 })

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 24 : direction === 'down' ? -24 : 0,
      x: direction === 'left' ? 24 : direction === 'right' ? -24 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration: 0.35,
        delay,
        ease: [0.25, 0, 0, 1],
      },
    },
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}
