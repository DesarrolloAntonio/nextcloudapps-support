# Apps for Nextcloud — website and support pages

Public site of the Apps for Nextcloud Android app, served with GitHub Pages. Plain static files, no
framework.

- Home: https://nextcloudapps.desarrollodroide.es/
- FAQ: https://nextcloudapps.desarrollodroide.es/faq/
- Press kit: https://nextcloudapps.desarrollodroide.es/press/
- Help: https://nextcloudapps.desarrollodroide.es/help/
- Privacy: https://nextcloudapps.desarrollodroide.es/privacy/

## Changing the site's address

The absolute URL lives in one place: `base_url` in `site.json`. After changing it, run:

```sh
python3 tools/build.py
```

That rewrites the generated `<head>` block of the home and FAQ pages (title, description, canonical,
Open Graph, Twitter card, JSON-LD) plus `sitemap.xml` and `robots.txt`. Titles and descriptions of
those pages are also edited in `site.json`. Every other link is relative.

## Files

- `index.html`, `faq/` — home page and FAQ; styled by `assets/site.css`, with `assets/site.js` for the
  colour picker and the morphing shapes.
- `help/`, `privacy/` — linked from Google Play; keep these URLs. Styled by `style.css`.
- `assets/img/` — screenshots (WebP), the Open Graph image and Google's Play badge (unmodified).
- `press/`, `assets/press/` — press kit page and its full-size images, GIFs and promo video. After
  changing a file, rebuild the zip (and update the sizes on the page):
  `cd assets/press && rm apps-for-nextcloud-press-kit.zip && zip -X apps-for-nextcloud-press-kit.zip *.png *.gif *.mp4`
