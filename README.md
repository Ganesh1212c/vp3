# Vettiyil Packaging website

A static website: plain HTML, CSS and JavaScript. No build step and no server code.

## Open it

Open `index.html` in a browser. Everything works straight from the folder.
To put it online, upload the whole folder to any web host.

Pages: `index.html` (Home), `about.html`, `products.html`, `sustainability.html`,
`infrastructure.html`, `contact.html`.

## Photos

The photos currently load from the company's live site (vettiyilpackaging.com), so
the page needs an internet connection to show them. To make the site fully
self-contained, run this once (needs Python 3):

    python3 tools/get-images.py

It saves every photo into `assets/img/` and switches the pages to use them.

## Things to confirm before launch

- Phone, email and address (in the footer, the contact page and `assets/site.js`).
- The numbers (1.5 crore boxes a month, 80+ machines, 150+ people, floor area).
  The Home page says 1.2 lakh sq ft and the Infrastructure page says 1 lakh+;
  pick one figure and use it on both.
- The short descriptions of printed and grey board boxes on the Products page.
- Where the quote form should go. It opens the visitor's email app addressed to
  sales@vettiyilpackaging.com, or a WhatsApp chat with +91 96063 33756.

## Credits and licences

- GSAP and ScrollTrigger: GSAP Standard "no charge" licence (`assets/vendor/GSAP-LICENSE.txt`).
- Lenis smooth scroll: MIT (`assets/vendor/LENIS-LICENSE.txt`).
- Fonts Instrument Sans and Barlow Condensed: SIL Open Font License 1.1, self-hosted in `assets/fonts/`.
