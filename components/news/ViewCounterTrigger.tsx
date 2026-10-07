'use client';

import { useEffect, useRef } from 'react';

interface ViewCounterTriggerProps {
  slug: string;
}

export default function ViewCounterTrigger({ slug }: ViewCounterTriggerProps) {
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current || !slug) return;
    triggeredRef.current = true;

    // Call view counter API
    fetch(`/api/news/slug/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
    }).catch((err) => {
      // ignore silently
    });
  }, [slug]);

  return null;
}
