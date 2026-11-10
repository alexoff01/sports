# SEO checklist (manual steps after launch)

Ranking takes weeks to months and **cannot be guaranteed**. These steps help search engines find, understand and trust the site; they do not promise any position.

## 1. Verify the domain
- **Google Search Console** (search.google.com/search-console): add a *Domain* property for `alexcearnau.com` and verify it with the **DNS TXT** record shown, at your registrar. (Alternative: URL-prefix property with the HTML tag: put the code in `GOOGLE_SITE_VERIFICATION` in `frontend/.env` and redeploy.)
- **Bing Webmaster Tools** (bing.com/webmasters): import from Search Console, or verify with DNS / `BING_SITE_VERIFICATION`.
- Neither tool needs cookies or scripts on the site. Do not add analytics without updating the Cookie Policy and the consent banner.

## 2. Submit the sitemap and request indexing
- Submit `https://alexcearnau.com/sitemap.xml` in both tools.
- In Search Console use *URL inspection > Request indexing* for: `/`, `/projects`, `/about`, `/contact`.
- After publishing a new project in the studio, **redeploy** (so it is prerendered and added to the static sitemap), then request indexing of the new project URL.

## 3. Consistent profiles (same name, bio, location, link)
Use the same name **Alex Cearnau**, the same short bio (for example "Sports social media & content creator. Football content, matchday storytelling and short-form video."), the location **Oradea, Romania**, and a link to **https://alexcearnau.com** on:
- LinkedIn (headline, About, Contact info > Website)
- Instagram, TikTok and X (bio + link)
When a profile is final, put its URL in `frontend/src/config/site.js` (replacing `TODO_CONFIRM`) and in `SAME_AS` in `backend/seo.py`, so it appears in the footer and in the `Person.sameAs` structured data.

## 4. Legitimate mentions and links
- The course platform profile (Social Media in Sports, FC Barcelona Innovation Hub), if it allows a website link.
- Sports and football communities you genuinely take part in, local student or business directories in Oradea/Bihor, your GitHub profile.
- No paid links, link exchanges or directory spam.

## 5. Keep publishing
- Add new projects regularly through the studio, each with a clear title, a specific summary, descriptive alt text and honest labels (Concept / Personal / Real).

## 6. Monthly checks
- Search Console: *Performance* (queries, clicks, CTR), *Pages/Coverage* (indexing errors), *Core Web Vitals*, *Enhancements* (structured data).
- Bing: *Search performance* and *Site scan*.
- Re-run Lighthouse (mobile) on Home, Projects, About, Contact and one project page.
