import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIssueForm, fieldsFromForm, review, checkUrl, clean, md, checkDiscount, comment, sniffImage, utm } from '../scripts/lib.mjs';

const body = (o = {}) => {
  const f = {
    'Product name': 'Acme CLI', 'Deal URL': 'https://acme.dev/black-friday', Category: 'Developer tools',
    Discount: '40% off annual plans', 'Coupon code': 'BF26', 'Start date': '2026-11-27', 'End date': '2026-11-30',
    'What is it': 'A command line tool that deploys containers to your own servers', 'Your relation to the product': 'I built it or work on it', ...o,
  };
  return Object.entries(f).map(([k, v]) => `### ${k}\n\n${v || '_No response_'}`).join('\n\n');
};
const run = (o, existing = [], now = '2026-11-26') => review(fieldsFromForm(parseIssueForm(body(o))), existing, now);

test('a complete submission is approved', () => {
  const r = run();
  assert.equal(r.verdict, 'approve');
  assert.equal(r.deal.category, 'dev');
  assert.equal(r.deal.url, 'https://acme.dev/black-friday');
});
test('tracking parameters are stripped', () => {
  assert.equal(run({ 'Deal URL': 'https://acme.dev/bf?ref=bob&utm_source=x&plan=pro' }).deal.url, 'https://acme.dev/bf?plan=pro');
});
test('missing fields ask for detail', () => {
  const r = run({ Discount: '', 'End date': '30 Nov' });
  assert.equal(r.verdict, 'needs-info');
  assert.equal(r.reasons.length, 2);
});
test('http, shorteners, affiliate networks and IPs are refused', () => {
  assert.equal(run({ 'Deal URL': 'http://acme.dev' }).verdict, 'needs-info');
  assert.equal(run({ 'Deal URL': 'https://bit.ly/abc' }).verdict, 'reject');
  assert.equal(run({ 'Deal URL': 'https://www.shareasale.com/r.cfm?b=1' }).verdict, 'reject');
  assert.equal(run({ 'Deal URL': 'https://169.254.169.254/latest' }).verdict, 'reject');
  assert.equal(run({ 'Deal URL': 'https://localhost/x' }).verdict, 'reject');
});
test('banned kinds of product are rejected', () => {
  assert.equal(run({ 'What is it': 'The best online casino bonus for developers this week' }).verdict, 'reject');
  assert.equal(run({ 'Product name': 'MoonToken', 'What is it': 'Join the presale and get guaranteed returns today' }).verdict, 'reject');
  assert.equal(run({ 'Product name': 'Planning Poker', 'What is it': 'Estimate sprint stories with your team in the browser' }).verdict, 'approve');
});
test('general retail is out of scope', () => {
  assert.equal(run({ 'Product name': 'UrbanThreads', 'What is it': 'Black Friday sale on clothing and sneakers for the whole family' }).verdict, 'reject');
  assert.equal(run({ 'Product name': 'Chrono', 'What is it': 'Luxury watches and jewellery at half price this weekend only' }).verdict, 'reject');
  assert.equal(run({ 'Product name': 'LogWatch', 'What is it': 'A daemon that watches your logs and alerts on error spikes' }).verdict, 'approve');
});
test('dates must be valid, ordered, current and inside the window', () => {
  assert.equal(run({ 'Start date': '2026-11-30', 'End date': '2026-11-27' }).verdict, 'needs-info');
  assert.equal(run({ 'Start date': '2026-11-10', 'End date': '2026-11-20' }).verdict, 'reject');
  assert.equal(run({ 'Start date': '2027-01-10', 'End date': '2027-01-20' }).verdict, 'reject');
  assert.equal(run({ 'End date': '2026-02-30' }).verdict, 'needs-info');
  assert.equal(run({ 'Start date': '2026-09-01', 'End date': '2026-12-31' }).verdict, 'needs-info');
});
test('duplicates are rejected by link or by name', () => {
  const existing = [{ name: 'Other', url: 'https://www.acme.dev/black-friday/' }];
  assert.equal(run({}, existing).verdict, 'reject');
  assert.equal(run({ 'Deal URL': 'https://acme.dev/other' }, [{ name: 'ACME cli', url: 'https://x.dev' }]).verdict, 'reject');
});
test('discounts must be sane', () => {
  assert.ok(checkDiscount('150% off'));
  assert.ok(checkDiscount('100% off'));
  assert.ok(checkDiscount('great deal'));
  assert.equal(checkDiscount('100% off: free for a year'), null);
  assert.equal(checkDiscount('$50 off the yearly plan'), null);
  assert.equal(checkDiscount('Lifetime deal'), null);
});
test('submitted text cannot carry markup into the README', () => {
  assert.equal(clean('<script>alert(1)</script> hi [x](https://evil.example) `code`\n| a'), 'alert(1) hi x code | a');
  assert.equal(md('a | b [c](d) *e*'), 'a \\| b c \\*e\\*');
  const r = run({ 'Product name': 'Acme <img src=x onerror=alert(1)>', 'Coupon code': 'BF26`; rm -rf /' });
  assert.equal(r.verdict, 'needs-info');
});
test('url check keeps the query the vendor needs', () => {
  const c = checkUrl('https://shop.acme.dev/p?coupon=BF26&via=joe#top');
  assert.equal(c.url, 'https://shop.acme.dev/p?coupon=BF26');
});

const ctx = { repo: 'meSingh/awesome-black-friday-dev-deals', site: 'https://example.dev/deals/', user: 'octo-cat' };
test('until the website is released, replies stay on GitHub and offer no badge', () => {
  const body = comment({ verdict: 'approve', reasons: [], deal: { id: 'acme-cli', name: 'Acme CLI', discount: '40% off', code: '', categoryName: 'Developer tools' } }, { repo: 'meSingh/awesome-black-friday-dev-deals', user: 'octo-cat' });
  assert.ok(!/https:\/\/dev\.express|%2F%2Fdev\.express|github\.io|badge/i.test(body));
  assert.ok(body.includes('See it in the [README](https://github.com/meSingh/awesome-black-friday-dev-deals#developer-tools).'));
  assert.ok(body.includes('&url=https%3A%2F%2Fgithub.com%2FmeSingh%2Fawesome-black-friday-dev-deals)'));
});
test('seller links carry our utm tags and nothing else changes', () => {
  const tags = 'utm_source=dev.express&utm_medium=github&utm_campaign=black-friday-2026';
  assert.equal(utm('https://acme.dev/deals'), `https://acme.dev/deals?${tags}`);
  assert.equal(utm('https://acme.dev/p?coupon=BF26'), `https://acme.dev/p?coupon=BF26&${tags}`);
  assert.equal(utm('https://acme.dev/p#pricing'), `https://acme.dev/p?${tags}#pricing`);
  assert.equal(utm('https://acme.dev/p?utm_source=theirs&UTM_Medium=x&utm_term=y&plan=pro#top'), `https://acme.dev/p?plan=pro&${tags}#top`);
  assert.equal(utm('https://acme.dev/', { medium: 'referral' }), 'https://acme.dev/?utm_source=dev.express&utm_medium=referral&utm_campaign=black-friday-2026');
  assert.equal(utm('mailto:hi@acme.dev'), 'mailto:hi@acme.dev');
  assert.equal(utm('not a link'), 'not a link');
});
test('the approval reply greets, links, asks without requiring, and credits nobody but the maintainer', () => {
  const body = comment({ verdict: 'approve', reasons: [], deal: { id: 'acme-cli', name: 'Acme CLI', discount: '40% off & more', code: 'BF26', categoryName: 'Developer tools' } }, ctx);
  assert.match(body, /^@octo-cat \*\*Acme CLI is live\.\*\*/);
  assert.ok(body.includes('#developer-tools'));
  assert.ok(body.includes('https://example.dev/deals/#deal-acme-cli'));
  assert.ok(body.includes('twitter.com/intent/tweet?text=Acme%20CLI%20is%20on%20the%20dev.express%20Black%20Friday%20list%3A%2040%25%20off%20%26%20more%20with%20code%20BF26.&url=https%3A%2F%2Fexample.dev%2Fdeals%2F'));
  assert.ok(body.includes('linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.dev%2Fdeals%2F'));
  assert.ok(body.includes('No pressure, your listing stays either way.'));
  assert.ok(!/paste this anywhere/i.test(body));
  assert.equal(body.split('https://dev.express/badges/listed-on-dev-express-dark.svg').length - 1, 2);
  assert.ok(!body.includes('shields.io'));
  assert.ok(body.includes('<a href="https://example.dev/deals/#deal-acme-cli">'));
  assert.ok(body.includes('linkedin.com/in/mesingh9') && body.includes('x.com/meSingh9'));
  assert.ok(!/\u2014|generated (by|with)|co-authored/i.test(body));
});
test('share links cannot be broken out of by submitted text', () => {
  const body = comment({ verdict: 'approve', reasons: [], deal: { id: 'x', name: 'A)](https://evil.example) "q" <b>', discount: '50% off\n&url=https://evil.example', code: '', categoryName: 'AI tools' } }, ctx);
  const tweet = body.match(/twitter\.com\/intent\/tweet\?[^)\s]+/)[0];
  assert.ok(!/[()<>" ]/.test(tweet));
  assert.equal(new URL('https://' + tweet).searchParams.get('url'), 'https://example.dev/deals/');
  assert.ok(!body.includes('@undefined') && !body.includes('<b>'));
});
test('needs-info, hold and decline replies are specific and carry no favours', () => {
  for (const verdict of ['needs-info', 'hold', 'reject']) {
    const body = comment({ verdict, reasons: ['Add the deal URL.'] }, { ...ctx, user: 'bad user!' });
    assert.ok(body.includes('- Add the deal URL.'));
    assert.ok(!/star the repo|share it/i.test(body));
    assert.ok(!body.includes('@bad'));
  }
});

test('an image link is optional, and a given one must be a public https link', () => {
  assert.equal(run().deal.image, '');
  assert.equal(run({ 'Image link': 'https://acme.dev/og.png?utm_source=x' }).deal.image, 'https://acme.dev/og.png');
  assert.equal(run({ 'Image link': 'http://acme.dev/og.png' }).verdict, 'needs-info');
  assert.equal(run({ 'Image link': 'https://169.254.169.254/x.png' }).verdict, 'needs-info');
  assert.equal(run({ 'Image link': 'javascript:alert(1)' }).verdict, 'needs-info');
});
test('a logo link is optional, and a given one must be a public https link', () => {
  assert.equal(run().deal.logo, '');
  assert.equal(run({ 'Logo link': 'https://acme.dev/icon.png?utm_source=x' }).deal.logo, 'https://acme.dev/icon.png');
  assert.equal(run({ 'Logo link': 'http://acme.dev/icon.png' }).verdict, 'needs-info');
  assert.equal(run({ 'Logo link': 'https://10.0.0.1/icon.png' }).verdict, 'needs-info');
});
test('an image is judged by its bytes, not its name', () => {
  assert.equal(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png');
  assert.equal(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'jpg');
  assert.equal(sniffImage(new TextEncoder().encode('RIFFxxxxWEBPVP8 ')), 'webp');
  assert.equal(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(sniffImage(new TextEncoder().encode('<html><script>alert(1)</script>')), null);
  assert.equal(sniffImage(new TextEncoder().encode('GIF89a')), null);
});
