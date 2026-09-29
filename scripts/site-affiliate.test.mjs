import assert from 'node:assert/strict';
import test from 'node:test';

const load = () => import('../src/lib/affiliate.ts');

test('approved merchants generate the correct Partner-Ads destination', async () => {
  const { buildAffiliateUrl } = await load();
  const cases = [
    ['proshop', 'https://www.proshop.dk/Smart-Home', '67785'],
    ['specialkamera', 'https://www.specialkamera.dk/', '65506'],
    ['robotteronline', 'https://robotteronline.dk/12-smart-home', '99869'],
    ['wattoo', 'https://www.wattoo.dk/elektronik-it/smart-home', '51434'],
    ['batteribyen', 'https://www.batteribyen.dk/', '3252'],
  ];
  for (const [store, destination, banner] of cases) {
    const link = new URL(buildAffiliateUrl(store, destination));
    assert.equal(link.origin, 'https://www.partner-ads.com');
    assert.equal(link.pathname, '/dk/klikbanner.php');
    assert.equal(link.searchParams.get('partnerid'), '55881');
    assert.equal(link.searchParams.get('bannerid'), banner);
    assert.equal(link.searchParams.get('htmlurl'), destination);
  }
});

test('deeplinks preserve nested query values, Danish characters and fragments', async () => {
  const { buildAffiliateUrl } = await load();
  const destination = 'https://www.proshop.dk/Smart-Home?q=pære%20%26%20sensor&sort=price#specs';
  const result = new URL(buildAffiliateUrl('proshop', destination));
  assert.equal(result.searchParams.get('htmlurl'), destination);
  assert.equal(result.searchParams.get('sort'), null);
  assert.equal(result.hash, '');
});

test('an incorrectly assigned merchant fails instead of emitting a broken tracking link', async () => {
  const { buildAffiliateUrl } = await load();
  for (const destination of [
    'https://www.wattoo.dk/',
    'https://proshop.dk.example.com/',
    'http://www.proshop.dk/',
    'https://name:password@www.proshop.dk/',
  ]) {
    assert.throws(() => buildAffiliateUrl('proshop', destination), /destination/i);
  }
});

test('pending or unconfigured programs cannot generate affiliate links', async () => {
  const { buildAffiliateUrl } = await load();
  for (const store of ['plusled', 'greenline', 'amazon', 'aliexpress']) {
    assert.throws(() => buildAffiliateUrl(store, 'https://www.proshop.dk/'), /merchant/i);
  }
});
