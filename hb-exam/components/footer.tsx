import React from 'react'

interface FooterProps {
  className?: string
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`ix-footer ${className}`}>
      <span className="ix-footer-text">Powered by</span>
      <img src="/hackboats-logo.png" alt="HackBoats" className="ix-footer-logo" />
    </footer>
  )
}
