import { Link } from 'react-router-dom';
import { Star, Briefcase } from 'lucide-react';
import type { DbProProfile, DbProCategory, DbProService } from '@/types/pro-connect';
import { ProAvailability } from '@/types/pro-connect';
import { VerificationBadgeInline } from '@/components/pro-connect/VerificationBadge';
import { classNames } from '@/lib/utils';

interface ProfessionalCardProps {
  profile: DbProProfile;
  category?: DbProCategory;
  services: DbProService[];
}

const availabilityConfig: Record<ProAvailability, { label: string; color: string; dot: string }> = {
  available: { label: 'Available', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  busy: { label: 'Busy', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  unavailable: { label: 'Unavailable', color: 'text-neutral-400 dark:text-neutral-500', dot: 'bg-neutral-400' },
};

export default function ProfessionalCard({ profile, category, services }: ProfessionalCardProps) {
  const avail = availabilityConfig[profile.availability];

  return (
    <Link
      to={`/pro-connect/${profile.slug}`}
      className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-brand-purple/30 hover:shadow-lg dark:border-white/5 dark:bg-brand-navy-mid dark:hover:border-brand-purple-lighter/30"
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {profile.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt={profile.display_name}
              loading="lazy"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-neutral-100 dark:ring-white/10"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple/10 to-brand-purple-light/10 text-xl font-semibold text-brand-purple dark:text-brand-purple-lighter">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-neutral-900 dark:text-white">
            {profile.display_name}
          </h3>
          {profile.business_name && (
            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
              {profile.business_name}
            </p>
          )}
          {category && (
            <p className="mt-0.5 text-xs font-medium text-brand-purple dark:text-brand-purple-lighter">
              {category.name}
            </p>
          )}
          {/* Verification badge */}
          <div className="mt-1.5">
            <VerificationBadgeInline profile={profile} />
          </div>
        </div>
      </div>

      {/* Rating + Availability */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        {profile.rating_count > 0 ? (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium text-neutral-700 dark:text-neutral-200">
              {profile.rating_avg.toFixed(1)}
            </span>
            <span className="text-neutral-400 dark:text-neutral-500">
              ({profile.rating_count})
            </span>
          </div>
        ) : (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">No reviews yet</span>
        )}

        <div className={classNames('flex items-center gap-1.5', avail.color)}>
          <span className={classNames('h-1.5 w-1.5 rounded-full', avail.dot)} />
          <span className="text-xs font-medium">{avail.label}</span>
        </div>
      </div>

      {/* Services */}
      {services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {services.slice(0, 3).map((s) => (
            <span
              key={s.id}
              className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-300"
            >
              {s.name}
            </span>
          ))}
          {services.length > 3 && (
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
              +{services.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Bio preview */}
      {profile.bio && (
        <p className="mt-3 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
          {profile.bio}
        </p>
      )}

      {/* Experience */}
      {profile.years_experience && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
          <Briefcase className="h-3.5 w-3.5" />
          <span>{profile.years_experience} years experience</span>
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto pt-4">
        <span className="inline-flex w-full items-center justify-center rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors group-hover:border-brand-purple group-hover:bg-brand-purple group-hover:text-white dark:border-white/10 dark:text-neutral-200 dark:group-hover:border-brand-purple dark:group-hover:bg-brand-purple">
          View Profile
        </span>
      </div>
    </Link>
  );
}
