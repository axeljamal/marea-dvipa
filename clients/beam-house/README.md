# The Beam House — direct-booking site

Guest site and owner view for a holiday let, built as the Marea Dvīpa baseline: one HTML file, no framework, every
photo with alt text, skip link, keyboard calendar, light and dark themes, consent before analytics.

- `index.html` — the guest site. Published as a Claude artifact at https://claude.ai/artifact/7FQvk8xqbTHMU8QFNkqM9T;
  this copy carries its own `<html>`/`<head>` skeleton so it also serves from any static host.
- `owner.html` — the owner view (the case for direct, the acquisition engine, the dashboard) behind a demo code gate.
  Linked only from a small footer button on the guest site. Also published separately at
  https://claude.ai/artifact/NKiyxucU7W2o8ZARADhZVC.
- `img/` — 32 owner photographs, converted to JPEG at most 1800 px wide with camera and location metadata stripped.
- `media/house-film.mp4` — the 28 s house film rendered from 11 of the photographs.

The "Ask the house" assistant uses the artifact runtime's `sample` capability and falls back to the in-page house notes
when that is absent, so the page works on a plain host with the assistant in fallback mode.

Still placeholders for the owner: the town and county in the schema and map text, the phone number, the Instagram
handle, Stripe for payments and vouchers, the mailing tool for the newsletter, analytics behind the consent hook, and a
read-through of the object stories and the walk texts.

Not deployed from this repo: it lives under `clients/`, outside `public/`, so the single build does not publish it.
