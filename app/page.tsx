import React from 'react';
import { getHomeInitialData } from '@/lib/db/home';
import HomeClientView from '@/components/home/HomeClientView';

export const runtime = 'nodejs';

export default async function HomePage() {
  const initialData = await getHomeInitialData();

  return <HomeClientView initialData={initialData} />;
}
