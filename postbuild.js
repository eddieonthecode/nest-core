#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const modules = [
  'decorators',
  'interceptors', 
  'models',
  'naming-strategies',
  'routes',
  'utils',
  'validators'
];

// Create package.json files for each module
modules.forEach(module => {
  const modulePath = path.join(process.cwd(), 'dist', module);
  const packageJson = {
    name: `@eddieonthecode/nest-core/${module}`,
    private: true,
    main: './index.js',
    types: './index.d.ts'
  };
  
  if (fs.existsSync(modulePath)) {
    fs.writeFileSync(
      path.join(modulePath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    console.log(`Created package.json for ${module}`);
  }
});

// Create comprehensive main.d.ts for IDE suggestions
const mainDts = `// Main package exports
export * from './index';

// Module exports for IDE auto-completion
export * from './decorators/index';
export * from './interceptors/index';
export * from './models/index';
export * from './naming-strategies/index';
export * from './routes/index';
export * from './utils/index';
export * from './validators/index';

// Individual file exports for better IDE suggestions
export * from './decorators';
export * from './interceptors';
export * from './models';
export * from './naming-strategies';
export * from './routes';
export * from './utils';
export * from './validators';
`;

fs.writeFileSync(
  path.join(process.cwd(), 'dist', 'main.d.ts'),
  mainDts
);
console.log('Created main.d.ts for IDE suggestions');
