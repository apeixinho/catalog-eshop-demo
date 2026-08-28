CREATE DATABASE IF NOT EXISTS catalog_auth;
GRANT ALL PRIVILEGES ON catalog_auth.* TO 'catalog_user'@'%';
FLUSH PRIVILEGES;
