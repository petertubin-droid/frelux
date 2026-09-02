import { AdminHeader, AdminCard } from '@/components/admin/AdminUi';

export default function AdminSeo() {
  return (
    <>
      <AdminHeader title="SEO Settings" subtitle="Manage search engine optimization settings." />
      <AdminCard>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">Global SEO</h3>
            <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">Site wide SEO configuration is managed through site settings and individual page meta tags.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SeoInfoCard title="Sitemap" description="Automatically generated at /sitemap.xml" />
            <SeoInfoCard title="Robots.txt" description="Configured at /robots.txt" />
            <SeoInfoCard title="Open Graph" description="Per page OG tags set via useSeo hook" />
            <SeoInfoCard title="Structured Data" description="JSON LD schema on Home, Colors, and Learn pages" />
          </div>

          <div className="rounded-lg border border-border bg-muted/50 dark:bg-white/5 dark:border-white/5 p-4">
            <h4 className="text-sm font-semibold text-foreground dark:text-primary-foreground">SEO Coverage</h4>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>- Home page: WebApplication schema with offers</li>
              <li>- Color Library: CollectionPage ready metadata</li>
              <li>- Learn articles: Article schema with author and datePublished</li>
              <li>- Legal pages: noindex for non content pages</li>
              <li>- Learn section: SEO ready with per article meta title, description, and keywords</li>
            </ul>
          </div>
        </div>
      </AdminCard>
    </>
  );
}

function SeoInfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="text-sm font-semibold text-foreground dark:text-primary-foreground">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">{description}</p>
    </div>
  );
}
