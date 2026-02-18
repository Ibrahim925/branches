#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const teamId = process.env.APPLE_TEAM_ID || 'ABCDE12345';
const bundleId = process.env.IOS_BUNDLE_ID || 'com.branches.familytree';
const outputPath = resolve(process.cwd(), 'public/.well-known/apple-app-site-association');

const payload = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: [`${teamId}.${bundleId}`],
        components: [
          {
            '/': '/invite/*',
          },
        ],
      },
    ],
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.info(`Generated ${outputPath} for ${teamId}.${bundleId}`);
