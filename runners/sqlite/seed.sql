-- Runly.dev Pre-seeded Movie Database
-- Indian Cinema: Telugu & Hindi Movies

CREATE TABLE movies (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    genre TEXT NOT NULL,
    lead_actor TEXT NOT NULL,
    lead_actress TEXT NOT NULL,
    director TEXT NOT NULL,
    release_year INTEGER NOT NULL,
    rating REAL,
    box_office_cr REAL
);

INSERT INTO movies VALUES (1, 'Baahubali 2: The Conclusion', 'Telugu', 'Action', 'Prabhas', 'Anushka Shetty', 'S.S. Rajamouli', 2017, 8.2, 1810);
INSERT INTO movies VALUES (2, 'RRR', 'Telugu', 'Action', 'Ram Charan', 'Alia Bhatt', 'S.S. Rajamouli', 2022, 7.8, 1200);
INSERT INTO movies VALUES (3, 'Pushpa: The Rise', 'Telugu', 'Action', 'Allu Arjun', 'Rashmika Mandanna', 'Sukumar', 2021, 7.6, 365);
INSERT INTO movies VALUES (4, 'Pushpa 2: The Rule', 'Telugu', 'Action', 'Allu Arjun', 'Rashmika Mandanna', 'Sukumar', 2024, 6.3, 1831);
INSERT INTO movies VALUES (5, 'Eega', 'Telugu', 'Fantasy', 'Nani', 'Samantha Ruth Prabhu', 'S.S. Rajamouli', 2012, 7.7, 85);
INSERT INTO movies VALUES (6, 'Arjun Reddy', 'Telugu', 'Drama', 'Vijay Deverakonda', 'Shalini Pandey', 'Sandeep Reddy Vanga', 2017, 7.9, 51);
INSERT INTO movies VALUES (7, 'Ala Vaikunthapurramuloo', 'Telugu', 'Action', 'Allu Arjun', 'Pooja Hegde', 'Trivikram Srinivas', 2020, 7.3, 262);
INSERT INTO movies VALUES (8, 'Jersey', 'Telugu', 'Sports', 'Nani', 'Shraddha Srinath', 'Gowtam Tinnanuri', 2019, 8.0, 60);
INSERT INTO movies VALUES (9, 'Rangasthalam', 'Telugu', 'Drama', 'Ram Charan', 'Samantha Ruth Prabhu', 'Sukumar', 2018, 7.8, 216);
INSERT INTO movies VALUES (10, 'Mahanati', 'Telugu', 'Biography', 'Keerthy Suresh', 'Dulquer Salmaan', 'Nag Ashwin', 2018, 8.4, 76);
INSERT INTO movies VALUES (11, 'Dangal', 'Hindi', 'Sports', 'Aamir Khan', 'Fatima Sana Shaikh', 'Nitesh Tiwari', 2016, 8.4, 2024);
INSERT INTO movies VALUES (12, '3 Idiots', 'Hindi', 'Comedy', 'Aamir Khan', 'Kareena Kapoor', 'Rajkumar Hirani', 2009, 8.4, 460);
INSERT INTO movies VALUES (13, 'Jawan', 'Hindi', 'Action', 'Shah Rukh Khan', 'Nayanthara', 'Atlee', 2023, 6.9, 1148);
INSERT INTO movies VALUES (14, 'Pathaan', 'Hindi', 'Action', 'Shah Rukh Khan', 'Deepika Padukone', 'Siddharth Anand', 2023, 6.6, 1050);
INSERT INTO movies VALUES (15, 'Animal', 'Hindi', 'Drama', 'Ranbir Kapoor', 'Rashmika Mandanna', 'Sandeep Reddy Vanga', 2023, 6.2, 917);
INSERT INTO movies VALUES (16, 'PK', 'Hindi', 'Comedy', 'Aamir Khan', 'Anushka Sharma', 'Rajkumar Hirani', 2014, 8.1, 854);
INSERT INTO movies VALUES (17, 'Bajrangi Bhaijaan', 'Hindi', 'Drama', 'Salman Khan', 'Kareena Kapoor', 'Kabir Khan', 2015, 8.0, 969);
INSERT INTO movies VALUES (18, 'Kalki 2898 AD', 'Telugu', 'Sci-Fi', 'Prabhas', 'Deepika Padukone', 'Nag Ashwin', 2024, 6.4, 1100);
INSERT INTO movies VALUES (19, 'Sita Ramam', 'Telugu', 'Romance', 'Dulquer Salmaan', 'Mrunal Thakur', 'Hanu Raghavapudi', 2022, 8.0, 78);
INSERT INTO movies VALUES (20, 'Kantara', 'Telugu', 'Action', 'Rishab Shetty', 'Sapthami Gowda', 'Rishab Shetty', 2022, 8.3, 410);

CREATE TABLE actors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    born_year INTEGER,
    nationality TEXT DEFAULT 'Indian'
);

INSERT INTO actors VALUES (1, 'Prabhas', 1979, 'Indian');
INSERT INTO actors VALUES (2, 'Allu Arjun', 1982, 'Indian');
INSERT INTO actors VALUES (3, 'Ram Charan', 1985, 'Indian');
INSERT INTO actors VALUES (4, 'Vijay Deverakonda', 1989, 'Indian');
INSERT INTO actors VALUES (5, 'Nani', 1984, 'Indian');
INSERT INTO actors VALUES (6, 'Shah Rukh Khan', 1965, 'Indian');
INSERT INTO actors VALUES (7, 'Aamir Khan', 1965, 'Indian');
INSERT INTO actors VALUES (8, 'Salman Khan', 1965, 'Indian');
INSERT INTO actors VALUES (9, 'Ranbir Kapoor', 1982, 'Indian');

.headers on
.mode column
