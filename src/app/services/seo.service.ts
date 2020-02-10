import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

@Injectable()
export class SeoService {

  constructor(
    private meta: Meta, private titleService: Title,
    @Inject(DOCUMENT) private doc) { }

  createLink(rel: string, url: string) {
    let link: HTMLLinkElement = this.doc.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', `https://safeharbours.ca/${url}`);
    this.doc.head.appendChild(link);
  }

  generateTags(tags?) {
    // default values
    tags = {
      title: 'Safe Harbours Family Treatment Homes',
      description: 'Safe Harbours provides high quality foster care in Ontario. We recruit only the best foster homes to ensure great outcomes for our foster children.',
      image: 'https://firebasestorage.googleapis.com/v0/b/safeharbours-ontario.appspot.com/o/site_assets%2Fimages%2Flogo_64x64.png?alt=media&token=e991bf95-3c89-4bc3-90d1-31568bd179f0',
      slug: '',
      ...tags
    }

    // Set a title
    this.titleService.setTitle(`${tags.title} - Safe Harbours`);

    this.createLink('canonical', tags.slug);

    // Set meta tags
    this.meta.updateTag({ name: 'description', content: tags.description });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:site', content: '@SafeHarbours' });
    this.meta.updateTag({ name: 'twitter:title', content: tags.title });
    this.meta.updateTag({ name: 'twitter:description', content: tags.description });
    this.meta.updateTag({ name: 'twitter:image', content: tags.image });

    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Safe Harbours' });
    this.meta.updateTag({ property: 'og:title', content: `${tags.title} - Safe Harbours` });
    this.meta.updateTag({ property: 'og:description', content: tags.description });
    this.meta.updateTag({ property: 'og:image', content: tags.image });
    this.meta.updateTag({ property: 'og:url', content: `https://safeharbours.ca/${tags.slug}` });
  }
}