import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Branches',
  description: 'Sign in to your family tree',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone via-white to-leaf/20">
      {children}
    </div>
  );
}
