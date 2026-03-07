import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({
  name: 'youtubeEmbed',
  standalone: true
})
export class YoutubeEmbedPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string): SafeResourceUrl {

    if (!url) return '';

    let videoId = '';

    if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1];
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

}