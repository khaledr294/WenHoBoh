/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../types';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  lang?: Language;
}

export default function Logo({ className = '', showText = true, size = 'md', lang = 'ar' }: LogoProps) {
  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className={`relative ${dimensions[size]}`}>
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="logoPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#30E3CA" />
              <stop offset="100%" stopColor="#00A9E0" />
            </linearGradient>
          </defs>
          {/* Location Pin Shape */}
          <path 
            d="M100 15C58.6 15 25 48.6 25 90c0 52.5 75 95 75 95s75-42.5 75-95c0-41.4-33.6-75-75-75z" 
            fill="url(#logoPinGrad)" 
          />
          {/* Inner White Circle */}
          <circle cx="100" cy="90" r="42" fill="#FFFFFF" />
          {/* Diagonal Pill */}
          <g transform="rotate(-45 100 90)">
            {/* Upper half of capsule (Teal) */}
            <path d="M80 90 A20 20 0 0 1 120 90 L120 70 A20 20 0 0 1 80 70 Z" fill="#30E3CA" />
            {/* Lower half of capsule (Dark Blue) */}
            <path d="M80 90 A20 20 0 0 0 120 90 L120 110 A20 20 0 0 0 80 110 Z" fill="#121E31" />
            {/* Divider Line */}
            <line x1="77" y1="90" x2="123" y2="90" stroke="#FFFFFF" strokeWidth="4" />
          </g>
        </svg>
      </div>
      {showText && (
        <div className="mt-2 select-none">
          <h1 className="text-2xl md:text-3xl font-black text-[#121E31] tracking-tight font-sans">
            {lang === 'ar' ? 'وينهوبه' : 'وينهوبه'}
          </h1>
          <p className="text-[10px] md:text-[11px] font-black text-[#00A9E0] tracking-[0.25em] uppercase font-mono mt-0.5">
            WENHOBOH
          </p>
          <p className="text-[9px] md:text-[10px] text-slate-500 font-medium mt-1 leading-normal">
            {lang === 'ar' 
              ? 'دواؤك ومنتجاتك الصيدلية.. أقرب مما تتخيل' 
              : 'Your medicine & pharmacy items.. Closer than you think'}
          </p>
        </div>
      )}
    </div>
  );
}
