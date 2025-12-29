import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-5',
  md: 'h-6',
  lg: 'h-8',
};

export function Logo({ href, size = 'md', className = '' }: LogoProps) {
  const heightClass = sizeMap[size];
  
  const logo = (
    <Image
      src="/logo.svg"
      alt="Rendez"
      width={200}
      height={31}
      className={`${heightClass} w-auto ${className}`}
      priority
    />
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-80">
        {logo}
      </Link>
    );
  }

  return logo;
}

