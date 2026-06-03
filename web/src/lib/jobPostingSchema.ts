// Builds schema.org JobPosting JSON-LD so Google for Jobs can index a posting.
// https://developers.google.com/search/docs/appearance/structured-data/job-posting
import { site } from '../data/site';
import type { JobPosting } from './jobs';

const EMPLOYMENT_TYPE: Record<string, string> = {
  'Full-Time': 'FULL_TIME',
  'Part-Time': 'PART_TIME',
  'Casual-Relief': 'PER_DIEM',
  'Relief-Casual': 'PER_DIEM',
  Contract: 'CONTRACTOR',
};

export function jobPostingJsonLd(job: JobPosting, canonicalUrl: string): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.fullDescription ?? job.shortSummary ?? job.title,
    datePosted: job.publishedAt ?? job.openDate ?? undefined,
    validThrough: `${job.closingDate}T23:59:59-05:00`,
    employmentType: job.employmentType ? EMPLOYMENT_TYPE[job.employmentType] ?? 'OTHER' : undefined,
    url: canonicalUrl,
    directApply: false,
    hiringOrganization: {
      '@type': 'Organization',
      name: site.name,
      sameAs: site.url,
      logo: `${site.url}/images/og-default.jpg`,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.city ?? site.address.city,
        addressRegion: job.region ?? 'ON',
        addressCountry: 'CA',
      },
    },
    applicantLocationRequirements: { '@type': 'Country', name: 'Canada' },
  };

  if (job.numberOfOpenings && job.numberOfOpenings > 1) jsonLd.totalJobOpenings = job.numberOfOpenings;

  if (job.wageMin != null || job.wageMax != null) {
    const unit = job.payBasis === 'Annual' ? 'YEAR' : 'HOUR';
    jsonLd.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'CAD',
      value: {
        '@type': 'QuantitativeValue',
        ...(job.wageMin != null ? { minValue: job.wageMin } : {}),
        ...(job.wageMax != null ? { maxValue: job.wageMax } : {}),
        unitText: unit,
      },
    };
  }

  // Drop undefined keys (JSON.stringify already omits them, but keep it tidy).
  return jsonLd;
}
