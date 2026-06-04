#!/usr/bin/env bash

# Create SQLite database if it doesn't exist and run migrations
DB_PATH="/var/www/html/database/database.sqlite"

if [ ! -f "$DB_PATH" ]; then
    touch "$DB_PATH"
fi

chown www-data:www-data "$DB_PATH"
/usr/bin/php /var/www/html/artisan migrate --force --no-ansi -q
