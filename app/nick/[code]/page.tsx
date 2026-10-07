import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function NickAliasRedirectPage({ params }: PageProps) {
  const { code } = await params;
  const cleanCode = decodeURIComponent(code || '').replace(/^#/, '');

  // 301 Permanent Redirect chuẩn SEO về URL sản phẩm chính thống
  redirect(`/account/${encodeURIComponent(cleanCode)}`);
}
