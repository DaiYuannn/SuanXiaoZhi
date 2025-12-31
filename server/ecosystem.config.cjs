module.exports = {
  apps: [
    {
      name: 'app-backend',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5177,
        // SQLite 文件路径请根据部署机实际持久化目录调整
        DATABASE_URL: 'file:./data/prod.db?connection_limit=1',
        // 允许的跨域来源（逗号分隔），如 https://yourdomain.com,https://admin.yourdomain.com
        ALLOWED_ORIGINS: '',
        // 可在部署机通过环境注入 DeepSeek key（不建议写入文件）
        DEEPSEEK_API_KEY: ''
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
