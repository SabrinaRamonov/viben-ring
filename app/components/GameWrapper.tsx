'use client';

import dynamic from 'next/dynamic';

export const Game = dynamic(() => import('./Game'), { ssr: false });