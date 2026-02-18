import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Branches — Your Family Tree, Reimagined',
  description:
    'A private, beautiful space where your family grows together. Real-time collaboration, stunning tree visualization, and stories that last forever.',
  openGraph: {
    title: 'Branches — Your Family Tree, Reimagined',
    description:
      'A private, beautiful space where your family grows together.',
    type: 'website',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
