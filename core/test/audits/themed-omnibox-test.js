/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ThemedOmniboxAudit from '../../audits/themed-omnibox.js';
import {parseManifest} from '../../lib/manifest-parser.js';
import {readJson} from '../test-utils.js';

const manifest = readJson('../fixtures/manifest.json', import.meta);

const manifestSrc = JSON.stringify(manifest);
const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

/**
 * @param {string} src
 */
function generateMockArtifacts(src = manifestSrc) {
  const exampleManifest = parseManifest(src, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

  return {
    WebAppManifest: exampleManifest,
    InstallabilityErrors: {errors: []},
    MetaElements: [{name: 'theme-color', content: '#bada55'}],
  };
}

function generateMockAuditContext() {
  return {
    computedCache: new Map(),
  };
}
describe('PWA: themed omnibox audit', () => {
  it('fails if page had no manifest', () => {
    const artifacts = generateMockArtifacts();
    artifacts.WebAppManifest = null;
    const context = generateMockAuditContext();

    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.score, 0);
      assert.ok(result.explanation.includes('No manifest was fetched'), result.explanation);
    });
  });

  // Need to disable camelcase check for dealing with theme_color.
  /* eslint-disable camelcase */
  it('fails when a minimal manifest contains no theme_color', () => {
    const artifacts = generateMockArtifacts(JSON.stringify({
      start_url: '/',
    }));
    const context = generateMockAuditContext();

    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 0);
      assert.ok(result.explanation);
    });
  });

  it('succeeds when a minimal manifest contains a theme_color', () => {
    const artifacts = generateMockArtifacts(JSON.stringify({
      theme_color: '#bada55',
    }));
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.explanation, undefined);
    });
  });

  /* eslint-enable camelcase */
  it('succeeds when a complete manifest contains a theme_color', () => {
    const artifacts = generateMockArtifacts();
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.explanation, undefined);
    });
  });

  it('fails and warns when no theme-color meta tag found', () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [];
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 0);
      assert.ok(result.explanation);
    });
  });

  it('succeeds when theme-color present in the html', () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [{name: 'theme-color', content: '#fafa33'}];
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.explanation, undefined);
    });
  });

  it('succeeds when theme-color has a CSS nickname content value', () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [{name: 'theme-color', content: 'red'}];
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.explanation, undefined);
    });
  });

  it('succeeds when theme-color has a CSS4 nickname content value', async () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [{name: 'theme-color', content: 'rebeccapurple'}]; // <3
    const context = generateMockAuditContext();

    const result = await ThemedOmniboxAudit.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.equal(result.explanation, undefined);
  });

  it('fails if HTML theme color is good, but manifest themecolor is bad', () => {
    const artifacts = generateMockArtifacts(JSON.stringify({
      start_url: '/',
    }));
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 0);
      assert.ok(result.explanation.includes('does not have `theme_color`'), result.explanation);
    });
  });

  it('fails if HTML theme color is bad, and manifest themecolor is good', () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [{name: 'theme-color'}];
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 0);
      assert.ok(result.explanation.includes('theme-color meta tag'), result.explanation);
    });
  });
});
