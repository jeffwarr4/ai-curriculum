module.exports = {
  apps: [
    {
      name: "ai-curriculum",
      script: "src/server/index.js",
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
