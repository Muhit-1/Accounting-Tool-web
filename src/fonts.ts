// Fonts are served from our own host (bundled by Vite), never from Google:
// loading them from fonts.googleapis.com sends every visitor's IP address to
// Google without consent, which German courts have treated as a GDPR breach.
// Only the Latin and Latin Extended sets are bundled (names with accents, e.g.
// Turkish, Vietnamese or Yoruba letters); the browser downloads a file only when
// the page uses a character from it. Plus Jakarta Sans for words, Roboto Mono
// for figures, Roboto Medium only for the Google sign-in button (brand rules).
// Do not add a third typeface.
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-800.css'
import '@fontsource/plus-jakarta-sans/latin-ext-400.css'
import '@fontsource/plus-jakarta-sans/latin-ext-500.css'
import '@fontsource/plus-jakarta-sans/latin-ext-600.css'
import '@fontsource/plus-jakarta-sans/latin-ext-700.css'
import '@fontsource/plus-jakarta-sans/latin-ext-800.css'
import '@fontsource/roboto-mono/latin-400.css'
import '@fontsource/roboto-mono/latin-500.css'
import '@fontsource/roboto-mono/latin-600.css'
import '@fontsource/roboto-mono/latin-ext-400.css'
import '@fontsource/roboto-mono/latin-ext-500.css'
import '@fontsource/roboto-mono/latin-ext-600.css'
import '@fontsource/roboto/latin-500.css'
