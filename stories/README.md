# LinguaFlow — Netlify project

## Structure

```text
LinguaFlow/
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   └── stories.js
├── stories/
│   ├── story-template.js
│   └── README.md
└── assets/
    └── icon.svg
```

## Deploy on Netlify

Upload the **whole LinguaFlow folder** as the site.

The file that Netlify serves first is:

`index.html`

Do not upload only `index.html`; the `css`, `js`, `data`, `stories`, and `assets` folders are part of the application.

## Adding stories

The current 25 stories are in:

`data/stories.js`

For future stories:

1. Copy `stories/story-template.js`.
2. Rename it, for example `story-26.js`.
3. Give it a unique numeric `id`.
4. Put the file in `stories/`.
5. Register it in `data/stories.js` or merge the object into the main `window.stories` array.

A normal static website cannot automatically discover arbitrary new JavaScript files in a folder. If you later want "drop a story file into the folder and it automatically appears", we can convert the project to a Vite/Netlify build setup.

## Reading behavior

When audio is playing:

- The sentence currently being read is highlighted.
- The current word is highlighted in yellow.
- The page scrolls only when the current sentence is outside the visible reading area.
- The next sentence therefore comes into view automatically without constantly moving the page.
- Clicking a sentence selects it and starts reading that sentence.

## iPhone

After deploying to Netlify:

1. Open the Netlify URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Open LinguaFlow from the Home Screen.

The included manifest and service worker prepare the site for PWA-style installation and caching.