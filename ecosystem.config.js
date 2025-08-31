module.exports = {
  apps: [
    {
      name: 'torch-fellowship-backend',
      script: 'server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000
      },
      
      // Restart policies
      watch: false, // Disable in production
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      
      // Process management
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Source map support for better error reporting
      source_map_support: true,
      
      // Advanced PM2 features
      automation: false,
      pmx: true,
      
      // Error handling
      ignore_watch: ['node_modules', 'logs', '.git'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // Advanced clustering options
      increment_var: 'PORT',
      
      // Monitoring
      monitoring: false,
      
      // Auto restart on file changes (disabled for production)
      autorestart: true,
      
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Memory and CPU limits
      max_memory_restart: '1G',
      
      // Node.js specific options
      node_args: [
        '--max-old-space-size=1024',
        '--experimental-modules'
      ],
      
      // Environment-specific settings
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5001
      }
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-ec2-instance-ip'], // Replace with actual EC2 IP
      ref: 'origin/main',
      repo: 'https://github.com/your-username/torch-fellowship-backend.git', // Replace with actual repo
      path: '/home/ubuntu/torch-fellowship-backend',
      'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    staging: {
      user: 'ubuntu',
      host: ['your-staging-ec2-ip'], // Replace with staging EC2 IP
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/torch-fellowship-backend.git',
      path: '/home/ubuntu/torch-fellowship-backend-staging',
      'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js --env staging'
    }
  }
};