import React from 'react';

interface JsonLdProps {
  data: Record<string, any> | Array<Record<string, any>>;
}

/**
 * Component render Schema.org JSON-LD có cấu trúc an toàn,
 * tự động loại bỏ các ký tự nguy hiểm để chống XSS.
 */
export default function JsonLd({ data }: JsonLdProps) {
  if (!data) return null;

  // Chống XSS trong JSON-LD bằng cách escape dấu <
  const jsonString = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
