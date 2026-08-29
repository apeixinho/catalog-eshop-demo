INSERT INTO users (username, password, enabled) VALUES ('manager', '{noop}password', TRUE);
INSERT INTO authorities (username, authority) VALUES ('manager', 'ROLE_USER');
INSERT INTO authorities (username, authority) VALUES ('manager', 'ROLE_MANAGER');
