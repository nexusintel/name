#!/bin/bash

# Make deployment scripts executable
chmod +x deploy/deploy-ec2.sh
chmod +x deploy/deploy-docker-ec2.sh
chmod +x deploy/update.sh

echo \"✅ All deployment scripts are now executable\"
echo \"📋 Available scripts:\"
echo \"  - deploy/deploy-ec2.sh        - PM2 deployment to EC2\"
echo \"  - deploy/deploy-docker-ec2.sh - Docker deployment to EC2\"
echo \"  - deploy/update.sh           - Update deployed application\"
echo \"\"
echo \"📖 For detailed instructions, see:\"
echo \"  - EC2-DEPLOYMENT-GUIDE.md\"
echo \"  - DEPLOYMENT-CHECKLIST.md\"