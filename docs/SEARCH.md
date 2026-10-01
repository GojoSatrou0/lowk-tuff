# Getting Velocity Arena into Google Search

The public site is https://velocity-arena.netlify.app/. Version 1.8 adds a descriptive title and description, canonical URL, social metadata, WebSite/VideoGame structured data, visible gameplay instructions, `robots.txt`, and `sitemap.xml`. These help crawlers understand and discover the game; they do not guarantee indexing or a particular ranking.

## Submit the site for free

1. Open [Google Search Console](https://search.google.com/search-console/welcome) with your Google account.
2. Add a **URL prefix** property for `https://velocity-arena.netlify.app/`. A Domain property cannot verify ownership of Netlify's entire shared domain.
3. Choose **HTML tag** verification. Copy the exact verification meta tag into this project's `index.html` head, rebuild the Netlify frontend, and publish it. Keep the tag in later builds. Then click **Verify** in Search Console. The tag is a public ownership marker, not your Google password.
4. Under **Sitemaps**, submit `sitemap.xml`.
5. Inspect the homepage URL with **URL inspection**, run the live test, then choose **Request indexing**.

Verification and submission have not been performed for this update; they require the site owner's Search Console account. Google says crawling can take days to weeks and is not guaranteed. See [requesting a crawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) and [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Use “Velocity Arena” consistently in real posts and links that introduce your game. Share the homepage with players and keep the game useful and available. Avoid keyword stuffing, fake ratings, purchased backlinks or repeated indexing requests. A custom domain is optional and is not needed for indexing this Netlify address.

The backend's pages identify the Netlify homepage as canonical so the two hosts do not compete as separate copies. Account/API endpoints are excluded from crawling. Private files remain protected by the server's allowlist; robots.txt is not an access-control mechanism.
