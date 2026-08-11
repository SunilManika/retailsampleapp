-- Patch: rename users from Indian names to English names with US addresses
-- and set correct bcrypt hashes for Password@123
-- Run this against an already-running database to update in-place.

UPDATE users SET
    username = 'james.wilson',
    default_address = '742 Evergreen Terrace, Springfield, IL 62701',
    password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse'
WHERE id = 1;

UPDATE users SET username = 'emily.johnson',     default_address = '1600 Pennsylvania Ave NW, Washington, DC 20500',      password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 2;
UPDATE users SET username = 'michael.smith',     default_address = '350 Fifth Ave, New York, NY 10118',                   password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 3;
UPDATE users SET username = 'sarah.davis',       default_address = '1 Infinite Loop, Cupertino, CA 95014',                password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 4;
UPDATE users SET username = 'daniel.martinez',   default_address = '233 S Wacker Dr, Chicago, IL 60606',                  password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 5;
UPDATE users SET username = 'jessica.brown',     default_address = '500 Oracle Pkwy, Austin, TX 78701',                   password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 6;
UPDATE users SET username = 'christopher.lee',   default_address = '1 Microsoft Way, Redmond, WA 98052',                  password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 7;
UPDATE users SET username = 'ashley.wilson',     default_address = '3000 Hanover St, Palo Alto, CA 94304',                password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 8;
UPDATE users SET username = 'matthew.taylor',    default_address = '2111 N Highland Ave, Los Angeles, CA 90068',          password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 9;
UPDATE users SET username = 'amanda.anderson',   default_address = '1 Hacker Way, Menlo Park, CA 94025',                  password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 10;
UPDATE users SET username = 'joshua.thomas',     default_address = '600 Congress Ave, Austin, TX 78701',                  password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 11;
UPDATE users SET username = 'megan.jackson',     default_address = '100 Main St, Houston, TX 77002',                      password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 12;
UPDATE users SET username = 'ryan.white',        default_address = '55 Water St, New York, NY 10041',                     password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 13;
UPDATE users SET username = 'stephanie.harris',  default_address = '200 Park Ave, New York, NY 10166',                    password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 14;
UPDATE users SET username = 'brandon.martin',    default_address = '4 Pennsylvania Plaza, New York, NY 10001',            password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 15;
UPDATE users SET username = 'nicole.thompson',   default_address = '8080 Innovation Dr, Seattle, WA 98104',               password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 16;
UPDATE users SET username = 'tyler.garcia',      default_address = '1355 Market St, San Francisco, CA 94103',             password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 17;
UPDATE users SET username = 'kayla.rodriguez',   default_address = 'One Apple Park Way, Cupertino, CA 95014',             password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 18;
UPDATE users SET username = 'jason.martinez',    default_address = '1200 Brickell Ave, Miami, FL 33131',                  password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 19;
UPDATE users SET username = 'brittany.lewis',    default_address = '10 Hudson Yards, New York, NY 10001',                 password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 20;
UPDATE users SET username = 'andrew.robinson',   default_address = '222 W Merchandise Mart Plz, Chicago, IL 60654',      password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 21;
UPDATE users SET username = 'rachel.walker',     default_address = '300 E Main St, Richmond, VA 23219',                   password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 22;
UPDATE users SET username = 'kevin.hall',        default_address = '1500 Broadway, New York, NY 10036',                   password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 23;
UPDATE users SET username = 'samantha.allen',    default_address = '900 N Michigan Ave, Chicago, IL 60611',               password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 24;
UPDATE users SET username = 'eric.young',        default_address = '3101 Park Blvd, San Diego, CA 92103',                 password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 25;
UPDATE users SET username = 'heather.hernandez', default_address = '5151 State University Dr, Los Angeles, CA 90032',    password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 26;
UPDATE users SET username = 'adam.king',         default_address = '245 First St, Cambridge, MA 02142',                   password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 27;
UPDATE users SET username = 'jennifer.wright',   default_address = '77 Massachusetts Ave, Cambridge, MA 02139',           password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 28;
UPDATE users SET username = 'steven.scott',      default_address = '100 S Independence Mall W, Philadelphia, PA 19106',  password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 29;
UPDATE users SET username = 'laura.green',       default_address = '1500 Sugar Bowl Dr, New Orleans, LA 70112',          password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 30;
UPDATE users SET username = 'jacob.adams',       default_address = '400 Broad St, Seattle, WA 98109',                    password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 31;
UPDATE users SET username = 'olivia.baker',      default_address = '1 E 161 St, Bronx, NY 10451',                        password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 32;
UPDATE users SET username = 'ethan.gonzalez',    default_address = '1600 Main St, Houston, TX 77002',                    password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 33;
UPDATE users SET username = 'sophia.nelson',     default_address = '2600 Benjamin Franklin Pkwy, Philadelphia, PA 19130', password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 34;
UPDATE users SET username = 'liam.carter',       default_address = '301 Mission St, San Francisco, CA 94105',            password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 35;
UPDATE users SET username = 'emma.mitchell',     default_address = '500 W 33rd St, New York, NY 10001',                  password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 36;
UPDATE users SET username = 'noah.perez',        default_address = '700 Pennsylvania Ave NW, Washington, DC 20408',      password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 37;
UPDATE users SET username = 'ava.roberts',       default_address = '200 Convention Blvd, Nashville, TN 37203',           password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 38;
UPDATE users SET username = 'mason.turner',      default_address = '1234 Market St, San Francisco, CA 94102',            password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 39;
UPDATE users SET username = 'isabella.phillips', default_address = '8600 Rockville Pike, Bethesda, MD 20894',            password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 40;
UPDATE users SET username = 'william.campbell',  default_address = 'One World Trade Blvd, New York, NY 10007',           password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 41;
UPDATE users SET username = 'grace.parker',      default_address = '200 S Orange Ave, Orlando, FL 32801',                password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 42;
UPDATE users SET username = 'lucas.evans',       default_address = '401 W Peachtree St NW, Atlanta, GA 30308',           password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 43;
UPDATE users SET username = 'charlotte.edwards', default_address = '1 Center Court, Cleveland, OH 44115',                password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 44;
UPDATE users SET username = 'henry.collins',     default_address = '1800 Vine St, Los Angeles, CA 90028',                password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 45;
UPDATE users SET username = 'amelia.stewart',    default_address = '1901 N Moore St, Arlington, VA 22209',               password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 46;
UPDATE users SET username = 'alexander.sanchez', default_address = '55 E Monroe St, Chicago, IL 60603',                  password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 47;
UPDATE users SET username = 'mia.morris',        default_address = '400 N Michigan Ave, Chicago, IL 60611',              password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 48;
UPDATE users SET username = 'elijah.rogers',     default_address = '1 Embarcadero Ctr, San Francisco, CA 94111',         password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 49;
UPDATE users SET username = 'abigail.reed',      default_address = '3 World Financial Ctr, New York, NY 10281',          password_hash = '$2b$10$Ly.y2Uyam5lGhajzMKzt3uq.IIoiuZKyxedYQmd7LlBfS53jaYkse' WHERE id = 50;
