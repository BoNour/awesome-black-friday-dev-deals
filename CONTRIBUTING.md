# Contributing

## Submitting a deal

Use the [Submit a deal](https://github.com/meSingh/awesome-black-friday-dev-deals/issues/new?template=submit-deal.yml) form. Please do not edit `README.md` or `data/deals.json` by hand: both are updated automatically when a submission is approved, so a manual edit gets overwritten.

## The rules

A deal is listed when all of these hold:

- **It is a real Black Friday 2026 deal** on a product a developer would use, stated on the page you link to.
- **The link is the seller's own https page.** Link shorteners and affiliate networks are refused. Referral and tracking parameters (`ref`, `via`, `aff`, `utm_*` and similar) are removed from the stored link.
- **The dates are real.** Start and end in `YYYY-MM-DD`. The deal has not ended, it is running at some point in the Black Friday sale weeks, and it lasts no longer than 60 days. Deals that started early or run on into December are welcome.
- **The discount is specific.** "40% off annual plans" or "$50 off", in 60 characters or fewer. A percentage must be between 1 and 100.
- **The description is plain.** One sentence on what the product is, 160 characters or fewer, no sales copy.
- **A logo helps, and is optional.** A link to your product's logo or app icon: square, at least 128 pixels wide, png, jpg or webp. If you leave it empty, the icon your site declares is used.
- **The image is yours, and optional.** A link to your own banner or social image: png, jpg or webp, up to 5 MB. If you leave it empty, the social image from your page is used. It will sit next to your deal on the dev.express site when that opens. The site keeps its own copy, so your server is not hit on every visit.
- **It is not already listed.**

Never listed: general retail (clothing, watches, beauty, household goods), gambling, adult content, crypto and get-rich schemes. The list is for software and tools that developers, founders and AI builders use.

## What the reply on your issue means

| Reply | Meaning | What to do |
|---|---|---|
| "is live" | The deal is in the README | Nothing. A star or a share is welcome; your listing stays either way |
| "nearly there" | A field is missing or malformed | Edit the issue; it gets looked at again, usually within the hour |
| "nearly in" | Everything looks right, but the link would not open automatically | Nothing; the maintainer will open it and list it |
| "not one for this list" | The deal breaks a rule | Reply on the issue if you think we got it wrong |

## Changing a deal that is already listed

Open a new submission with the corrected details and mention the original issue. The old entry is replaced once the new one is approved by the maintainer.

## Changing the code

```bash
npm test          # the review rules
npm run build     # regenerate the README tables and data/site.json
```

`data/site.json` is the same list as plain data. The dev.express site, which is on its way, reads it.
