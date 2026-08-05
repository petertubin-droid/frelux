import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:py-32">
      <p className="text-7xl font-bold text-brand-purple">404</p>
      <h1 className="mt-4 text-2xl font-bold text-brand-navy">Page not found</h1>
      <p className="mt-2 text-sm text-neutral-500">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <Link to="/" className="btn-primary mt-6">
        <Home className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
