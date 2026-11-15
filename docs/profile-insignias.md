# Profile insignias

Migration: `20261109010000_profile_insignias.sql` (apply before deploying the UI).

- Existing altar achievements unlock intercessor, constancy and Gospel decorations.
- The altar administrator preview never grants eligibility.
- Administrators confirm received donations through Users > donation recognition.
- Only the database role join authorizes confirmation; browser state cannot grant recognition.
- Confirmation and revocation are audited; payment amounts are not stored here.
- Recognition does not charge money or integrate with a payment provider.
- Users opt into up to three name insignias and separately opt into the supporter profile card.
- Public lookup returns only eligible, explicitly selected decorations, not private progress.
- Name decorations are integrated in Profile, Friends and Community.
- Supporter recognition uses the same design regardless of contribution amount.
- The approved original concept board is preserved in `public/insignias/supporter-board.png`; CSS clips the supporter card without redrawing its artwork.

Validation: `node tests/insignias-database.mjs` checks permissions, eligibility, selection limits, revocation and privacy using isolated PostgreSQL (PGlite). `node tmp/insignias-preview.mjs` tests the UI against mocked RPCs at mobile and desktop sizes. No real donation is granted by tests.
