@echo off
ssh -i "D:\Projects\IB-program-trading\tradecoin-bot-key.pem" -o StrictHostKeyChecking=no ubuntu@34.235.119.67 "export $(grep DATABASE_URL ~/tastywork-trading/.env | head -1 | tr -d '\"' | xargs) && psql \"$DATABASE_URL\" -f /tmp/whop_trial_tables.sql > /tmp/migration_out.txt 2>&1 && echo MIGRATION_OK || echo MIGRATION_FAILED"
