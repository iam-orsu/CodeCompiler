// Runly.dev Pre-seeded Movie Database
// Indian Cinema: Telugu & Hindi Movies

db.movies.drop();
db.actors.drop();

db.movies.insertMany([
  { title: "Baahubali 2: The Conclusion", language: "Telugu", genre: "Action", lead_actor: "Prabhas", lead_actress: "Anushka Shetty", director: "S.S. Rajamouli", release_year: 2017, rating: 8.2, box_office_cr: 1810 },
  { title: "RRR", language: "Telugu", genre: "Action", lead_actor: "Ram Charan", lead_actress: "Alia Bhatt", director: "S.S. Rajamouli", release_year: 2022, rating: 7.8, box_office_cr: 1200 },
  { title: "Pushpa: The Rise", language: "Telugu", genre: "Action", lead_actor: "Allu Arjun", lead_actress: "Rashmika Mandanna", director: "Sukumar", release_year: 2021, rating: 7.6, box_office_cr: 365 },
  { title: "Pushpa 2: The Rule", language: "Telugu", genre: "Action", lead_actor: "Allu Arjun", lead_actress: "Rashmika Mandanna", director: "Sukumar", release_year: 2024, rating: 6.3, box_office_cr: 1831 },
  { title: "Eega", language: "Telugu", genre: "Fantasy", lead_actor: "Nani", lead_actress: "Samantha Ruth Prabhu", director: "S.S. Rajamouli", release_year: 2012, rating: 7.7, box_office_cr: 85 },
  { title: "Arjun Reddy", language: "Telugu", genre: "Drama", lead_actor: "Vijay Deverakonda", lead_actress: "Shalini Pandey", director: "Sandeep Reddy Vanga", release_year: 2017, rating: 7.9, box_office_cr: 51 },
  { title: "Ala Vaikunthapurramuloo", language: "Telugu", genre: "Action", lead_actor: "Allu Arjun", lead_actress: "Pooja Hegde", director: "Trivikram Srinivas", release_year: 2020, rating: 7.3, box_office_cr: 262 },
  { title: "Jersey", language: "Telugu", genre: "Sports", lead_actor: "Nani", lead_actress: "Shraddha Srinath", director: "Gowtam Tinnanuri", release_year: 2019, rating: 8.0, box_office_cr: 60 },
  { title: "Rangasthalam", language: "Telugu", genre: "Drama", lead_actor: "Ram Charan", lead_actress: "Samantha Ruth Prabhu", director: "Sukumar", release_year: 2018, rating: 7.8, box_office_cr: 216 },
  { title: "Mahanati", language: "Telugu", genre: "Biography", lead_actor: "Keerthy Suresh", lead_actress: "Dulquer Salmaan", director: "Nag Ashwin", release_year: 2018, rating: 8.4, box_office_cr: 76 },
  { title: "Dangal", language: "Hindi", genre: "Sports", lead_actor: "Aamir Khan", lead_actress: "Fatima Sana Shaikh", director: "Nitesh Tiwari", release_year: 2016, rating: 8.4, box_office_cr: 2024 },
  { title: "3 Idiots", language: "Hindi", genre: "Comedy", lead_actor: "Aamir Khan", lead_actress: "Kareena Kapoor", director: "Rajkumar Hirani", release_year: 2009, rating: 8.4, box_office_cr: 460 },
  { title: "Jawan", language: "Hindi", genre: "Action", lead_actor: "Shah Rukh Khan", lead_actress: "Nayanthara", director: "Atlee", release_year: 2023, rating: 6.9, box_office_cr: 1148 },
  { title: "Pathaan", language: "Hindi", genre: "Action", lead_actor: "Shah Rukh Khan", lead_actress: "Deepika Padukone", director: "Siddharth Anand", release_year: 2023, rating: 6.6, box_office_cr: 1050 },
  { title: "Animal", language: "Hindi", genre: "Drama", lead_actor: "Ranbir Kapoor", lead_actress: "Rashmika Mandanna", director: "Sandeep Reddy Vanga", release_year: 2023, rating: 6.2, box_office_cr: 917 },
  { title: "PK", language: "Hindi", genre: "Comedy", lead_actor: "Aamir Khan", lead_actress: "Anushka Sharma", director: "Rajkumar Hirani", release_year: 2014, rating: 8.1, box_office_cr: 854 },
  { title: "Bajrangi Bhaijaan", language: "Hindi", genre: "Drama", lead_actor: "Salman Khan", lead_actress: "Kareena Kapoor", director: "Kabir Khan", release_year: 2015, rating: 8.0, box_office_cr: 969 },
  { title: "Kalki 2898 AD", language: "Telugu", genre: "Sci-Fi", lead_actor: "Prabhas", lead_actress: "Deepika Padukone", director: "Nag Ashwin", release_year: 2024, rating: 6.4, box_office_cr: 1100 },
  { title: "Sita Ramam", language: "Telugu", genre: "Romance", lead_actor: "Dulquer Salmaan", lead_actress: "Mrunal Thakur", director: "Hanu Raghavapudi", release_year: 2022, rating: 8.0, box_office_cr: 78 },
  { title: "Kantara", language: "Telugu", genre: "Action", lead_actor: "Rishab Shetty", lead_actress: "Sapthami Gowda", director: "Rishab Shetty", release_year: 2022, rating: 8.3, box_office_cr: 410 }
]);

db.actors.insertMany([
  { name: "Prabhas", born_year: 1979, nationality: "Indian" },
  { name: "Allu Arjun", born_year: 1982, nationality: "Indian" },
  { name: "Ram Charan", born_year: 1985, nationality: "Indian" },
  { name: "Vijay Deverakonda", born_year: 1989, nationality: "Indian" },
  { name: "Nani", born_year: 1984, nationality: "Indian" },
  { name: "Shah Rukh Khan", born_year: 1965, nationality: "Indian" },
  { name: "Aamir Khan", born_year: 1965, nationality: "Indian" },
  { name: "Salman Khan", born_year: 1965, nationality: "Indian" },
  { name: "Ranbir Kapoor", born_year: 1982, nationality: "Indian" }
]);
