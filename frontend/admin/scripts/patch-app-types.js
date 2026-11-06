import fs from 'node:fs';
import path from 'node:path';

const appDir = path.resolve('node_modules/$app');
if (fs.existsSync(appDir)) {
  const pkgJson = path.join(appDir, 'package.json');
  fs.writeFileSync(
    pkgJson,
    JSON.stringify(
      {
        name: '$app',
        version: '1.0.0',
        main: './tsconfig.json',
        exports: {
          './tsconfig': './tsconfig.json',
          './tsconfig.json': './tsconfig.json',
          './tsconfig/service-worker': './tsconfig/service-worker.json',
          './types': './types/index.d.ts'
        }
      },
      null,
      2
    )
  );

  const tsconfigDir = path.join(appDir, 'tsconfig');
  if (fs.existsSync(tsconfigDir)) {
    const tsconfigInDir = path.join(tsconfigDir, 'tsconfig.json');
    if (!fs.existsSync(tsconfigInDir)) {
      try {
        fs.copyFileSync(path.join(appDir, 'tsconfig.json'), tsconfigInDir);
      } catch {
        // ignore
      }
    }
  }
}
