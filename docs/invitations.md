# Locked invitation masters

The invitation sources supplied for this feature were three standalone PNG
files—not Apple Pages `.template` packages. PNG header inspection found the
same **720 × 1008 pixel** canvas for each file, with no physical-resolution
metadata, embedded font files, text layers, or editable document structure.
The source bytes are retained losslessly as Base64 text in
`assets/invitations/` because the repository review transport does not support
binary patches. They are decoded back to the byte-identical PNG in memory.

| Gathering | Source asset | Replaceable regions | QR region |
| --- | --- | --- | --- |
| Christmas | `christmas-master.png.b64` | date `(104,401,514,48)`, address 1 `(119,496,482,38)`, address 2 `(133,531,454,38)`, RSVP `(239,840,248,42)` | `(562,850,158,158)` |
| Thanksgiving | `thanksgiving-master.png.b64` | date `(121,421,478,43)`, address 1 `(122,516,476,38)`, address 2 `(133,551,454,38)`, RSVP `(239,840,248,42)` | `(558,846,162,162)` |
| Wedding | `wedding-master.png.b64` | two-line date `(133,475,454,76)`, address 1 `(175,650,370,39)`, address 2 `(165,684,390,39)` | `(553,816,120,120)` |

Coordinates are in source pixels and are intentionally fixed. On-screen CSS
scales the whole canvas uniformly; export always uses the original coordinate
system. The renderer paints only the listed replaceable regions over the
unchanged source PNG, then draws dynamic text and a crisp QR with a four-module
quiet zone. All other wording and artwork remains in the supplied raster.

The raster sources do not identify their fonts. Dynamic serif text therefore
uses browser `Georgia` with `Times New Roman` as fallback, matched by weight,
italic style, size, color, alignment, and tracking in `invitation.js`. This is
a measured browser approximation, not verified access to the original font.

The supplied wedding image has neither an RSVP line nor a QR placeholder. Its
RSVP value is retained with the gathering settings for consistent annual
administration, but is not invented on the invitation. The wedding QR uses a
fixed blank lower-right area that does not cover the border or existing text;
unlike the holiday QR coordinates, that placement could not be verified
against a source QR.
