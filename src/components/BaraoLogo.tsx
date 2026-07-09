import React from "react";

interface BaraoLogoProps {
  className?: string;
}

export default function BaraoLogo({ className = "w-10 h-10" }: BaraoLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="barao-gold-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C5A059" />
          <stop offset="50%" stopColor="#D9BA7A" />
          <stop offset="100%" stopColor="#E5CD9D" />
        </linearGradient>
      </defs>

      {/* Outer Lotus Petals (Back Layer) */}
      <path
        d="M 50 82 C 28 82 12 68 10 52 C 10 40 22 28 34 32 C 30 42 32 58 50 72 C 68 58 70 42 66 32 C 78 28 90 40 90 52 C 88 68 72 82 50 82 Z"
        fill="url(#barao-gold-grad)"
        opacity="0.15"
      />

      {/* Symmetrical Left Petals */}
      <path
        d="M 15 65 C 5 55 12 36 24 40 C 21 48 24 58 36 68 C 26 68 18 67 15 65 Z"
        fill="url(#barao-gold-grad)"
        opacity="0.85"
      />
      <path
        d="M 28 75 C 16 75 18 60 28 52 C 27 60 31 68 40 73 C 34 76 30 76 28 75 Z"
        fill="url(#barao-gold-grad)"
        opacity="0.9"
      />

      {/* Symmetrical Right Petals */}
      <path
        d="M 85 65 C 95 55 88 36 76 40 C 79 48 76 58 64 68 C 74 68 82 67 85 65 Z"
        fill="url(#barao-gold-grad)"
        opacity="0.85"
      />
      <path
        d="M 72 75 C 84 75 82 60 72 52 C 73 60 69 68 60 73 C 66 76 70 76 72 75 Z"
        fill="url(#barao-gold-grad)"
        opacity="0.9"
      />

      {/* Bottom elegant curls supporting the lotus */}
      <path
        d="M 50 82 C 40 88 30 90 22 90 C 18 90 18 85 24 85 C 30 85 41 81 50 82 Z"
        fill="url(#barao-gold-grad)"
        opacity="0.7"
      />
      <path
        d="M 50 82 C 60 88 70 90 78 90 C 82 90 82 85 76 85 C 70 85 59 81 50 82 Z"
        fill="url(#barao-gold-grad)"
        opacity="0.7"
      />

      {/* Meditating Figure (Anjali Mudra / Lotus Pose) */}
      
      {/* 1. Palms raised above head meeting */}
      <path
        d="M 50 15 C 45 22 44 26 44 32 C 46 32 48 24 50 18 C 52 24 54 32 56 32 C 56 26 55 22 50 15 Z"
        fill="url(#barao-gold-grad)"
      />

      {/* 2. Head */}
      <circle cx="50" cy="38" r="4.5" fill="url(#barao-gold-grad)" />

      {/* 3. Upper body and raised arms curve */}
      <path
        d="M 50 45 C 44 45 40 48 38 54 C 37 58 39 60 41 60 C 43 60 44 54 50 54 C 56 54 57 60 59 60 C 61 60 63 58 62 54 C 60 48 56 45 50 45 Z"
        fill="url(#barao-gold-grad)"
      />
      {/* Arms connecting to head and mudra path */}
      <path
        d="M 38 54 C 36 44 42 34 46 32 C 45 34 43 45 38 54 Z"
        fill="url(#barao-gold-grad)"
        opacity="0.8"
      />
      <path
        d="M 62 54 C 64 44 58 34 54 32 C 55 34 57 45 62 54 Z"
        fill="url(#barao-gold-grad)"
        opacity="0.8"
      />

      {/* 4. Torso */}
      <path
        d="M 50 54 C 46 54 45 62 45 70 M 50 54 C 54 54 55 62 55 70"
        stroke="url(#barao-gold-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* 5. Crossed legs (Lotus base) */}
      <path
        d="M 50 70 C 36 70 30 74 30 79 C 30 83 42 83 50 83 C 58 83 70 83 70 79 C 70 74 64 70 50 70 Z"
        fill="url(#barao-gold-grad)"
      />
    </svg>
  );
}
