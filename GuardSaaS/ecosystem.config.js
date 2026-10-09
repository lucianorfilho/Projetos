module.exports = {
  apps: [
    {
      name: 'dbvault-api',
      script: '/var/www/dbguard/backend/src/index.js',
      cwd: '/var/www/dbguard/backend',
      env: { NODE_ENV: 'production', PORT: 4000 }
    },
    {
      name: 'dbvault-frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/dbguard/frontend',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
};
