-- Truncate existing data to ensure clean seed
TRUNCATE users, quiz_packages, tryout_packages, tryout_subtests, questions, user_purchases, attempts, attempt_answers, payments, leaderboard RESTART IDENTITY CASCADE;

-- Admin user (password: admin123)
INSERT INTO users (name, email, password, role, credit_balance) VALUES
('Admin TryOut Pintar', 'admin@tryoutpintar.com', '$2b$10$94JTtfoj1ZMozuj4FV9.MekwgZHC3TKaGYG0H6PJqTw3ici5UxOuy', 'admin', 9999);

-- Quiz Packages (7 subtes x 10 paket)
INSERT INTO quiz_packages (subtest, package_number, total_questions, time_minutes, price_credit) VALUES
('Penalaran Umum', 1, 30, 30, 0),('Penalaran Umum', 2, 30, 30, 250),('Penalaran Umum', 3, 30, 30, 250),('Penalaran Umum', 4, 30, 30, 250),('Penalaran Umum', 5, 30, 30, 250),
('Penalaran Umum', 6, 30, 30, 250),('Penalaran Umum', 7, 30, 30, 250),('Penalaran Umum', 8, 30, 30, 250),('Penalaran Umum', 9, 30, 30, 250),('Penalaran Umum', 10, 30, 30, 250),
('Pengetahuan & Pemahaman Umum', 1, 20, 15, 0),('Pengetahuan & Pemahaman Umum', 2, 20, 15, 250),('Pengetahuan & Pemahaman Umum', 3, 20, 15, 250),('Pengetahuan & Pemahaman Umum', 4, 20, 15, 250),('Pengetahuan & Pemahaman Umum', 5, 20, 15, 250),
('Pengetahuan & Pemahaman Umum', 6, 20, 15, 250),('Pengetahuan & Pemahaman Umum', 7, 20, 15, 250),('Pengetahuan & Pemahaman Umum', 8, 20, 15, 250),('Pengetahuan & Pemahaman Umum', 9, 20, 15, 250),('Pengetahuan & Pemahaman Umum', 10, 20, 15, 250),
('Pemahaman Bacaan & Menulis', 1, 20, 25, 0),('Pemahaman Bacaan & Menulis', 2, 20, 25, 250),('Pemahaman Bacaan & Menulis', 3, 20, 25, 250),('Pemahaman Bacaan & Menulis', 4, 20, 25, 250),('Pemahaman Bacaan & Menulis', 5, 20, 25, 250),
('Pemahaman Bacaan & Menulis', 6, 20, 25, 250),('Pemahaman Bacaan & Menulis', 7, 20, 25, 250),('Pemahaman Bacaan & Menulis', 8, 20, 25, 250),('Pemahaman Bacaan & Menulis', 9, 20, 25, 250),('Pemahaman Bacaan & Menulis', 10, 20, 25, 250),
('Pengetahuan Kuantitatif', 1, 20, 20, 0),('Pengetahuan Kuantitatif', 2, 20, 20, 250),('Pengetahuan Kuantitatif', 3, 20, 20, 250),('Pengetahuan Kuantitatif', 4, 20, 20, 250),('Pengetahuan Kuantitatif', 5, 20, 20, 250),
('Pengetahuan Kuantitatif', 6, 20, 20, 250),('Pengetahuan Kuantitatif', 7, 20, 20, 250),('Pengetahuan Kuantitatif', 8, 20, 20, 250),('Pengetahuan Kuantitatif', 9, 20, 20, 250),('Pengetahuan Kuantitatif', 10, 20, 20, 250),
('Literasi Bahasa Indonesia', 1, 30, 45, 0),('Literasi Bahasa Indonesia', 2, 30, 45, 250),('Literasi Bahasa Indonesia', 3, 30, 45, 250),('Literasi Bahasa Indonesia', 4, 30, 45, 250),('Literasi Bahasa Indonesia', 5, 30, 45, 250),
('Literasi Bahasa Indonesia', 6, 30, 45, 250),('Literasi Bahasa Indonesia', 7, 30, 45, 250),('Literasi Bahasa Indonesia', 8, 30, 45, 250),('Literasi Bahasa Indonesia', 9, 30, 45, 250),('Literasi Bahasa Indonesia', 10, 30, 45, 250),
('Literasi Bahasa Inggris', 1, 20, 20, 0),('Literasi Bahasa Inggris', 2, 20, 20, 250),('Literasi Bahasa Inggris', 3, 20, 20, 250),('Literasi Bahasa Inggris', 4, 20, 20, 250),('Literasi Bahasa Inggris', 5, 20, 20, 250),
('Literasi Bahasa Inggris', 6, 20, 20, 250),('Literasi Bahasa Inggris', 7, 20, 20, 250),('Literasi Bahasa Inggris', 8, 20, 20, 250),('Literasi Bahasa Inggris', 9, 20, 20, 250),('Literasi Bahasa Inggris', 10, 20, 20, 250),
('Penalaran Matematika', 1, 20, 45, 0),('Penalaran Matematika', 2, 20, 45, 250),('Penalaran Matematika', 3, 20, 45, 250),('Penalaran Matematika', 4, 20, 45, 250),('Penalaran Matematika', 5, 20, 45, 250),
('Penalaran Matematika', 6, 20, 45, 250),('Penalaran Matematika', 7, 20, 45, 250),('Penalaran Matematika', 8, 20, 45, 250),('Penalaran Matematika', 9, 20, 45, 250),('Penalaran Matematika', 10, 20, 45, 250);

-- Tryout Packages (10 paket)
INSERT INTO tryout_packages (package_number, price_credit) VALUES
(1, 0),(2, 1000),(3, 1000),(4, 1000),(5, 1000),(6, 1000),(7, 1000),(8, 1000),(9, 1000),(10, 1000);

-- Tryout Subtests for each package
INSERT INTO tryout_subtests (tryout_package_id, subtest, total_questions, time_minutes, sort_order)
SELECT tp.id, s.subtest, s.total_questions, s.time_minutes, s.sort_order
FROM tryout_packages tp
CROSS JOIN (
  SELECT 'Penalaran Umum' AS subtest, 30 AS total_questions, 30.0 AS time_minutes, 1 AS sort_order UNION ALL
  SELECT 'Pengetahuan & Pemahaman Umum', 20, 15.0, 2 UNION ALL
  SELECT 'Pemahaman Bacaan & Menulis', 20, 25.0, 3 UNION ALL
  SELECT 'Pengetahuan Kuantitatif', 20, 20.0, 4 UNION ALL
  SELECT 'Literasi Bahasa Indonesia', 30, 42.5, 5 UNION ALL
  SELECT 'Literasi Bahasa Inggris', 20, 20.0, 6 UNION ALL
  SELECT 'Penalaran Matematika', 20, 42.5, 7
) s;

-- Sample Questions for Penalaran Umum Paket 1
INSERT INTO questions (subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, category, difficulty) VALUES
('Penalaran Umum', 1, 'Jika semua kucing adalah hewan, dan semua hewan memiliki nyawa, maka...', 'Semua kucing tidak memiliki nyawa', 'Semua kucing memiliki nyawa', 'Beberapa kucing memiliki nyawa', 'Tidak ada kucing yang memiliki nyawa', 'Semua hewan adalah kucing', 'B', 'Logika', 'easy'),
('Penalaran Umum', 1, 'Deret: 2, 6, 18, 54, ... Angka selanjutnya adalah?', '108', '162', '148', '172', '216', 'B', 'Deret Angka', 'easy'),
('Penalaran Umum', 1, 'Ali lebih tinggi dari Budi. Budi lebih tinggi dari Cici. Dedi lebih tinggi dari Ali. Siapa yang paling pendek?', 'Ali', 'Budi', 'Cici', 'Dedi', 'Tidak dapat ditentukan', 'C', 'Logika', 'medium'),
('Penalaran Umum', 1, 'Jika A -> B dan B -> C, maka yang pasti benar adalah...', 'C -> A', 'A -> C', 'B -> A', 'C -> B', 'Tidak ada yang benar', 'B', 'Logika', 'medium'),
('Penalaran Umum', 1, 'Deret: 1, 1, 2, 3, 5, 8, ... Angka selanjutnya adalah?', '11', '12', '13', '14', '15', 'C', 'Deret Angka', 'easy'),
('Penalaran Umum', 1, 'Dalam suatu kode, MEJA ditulis sebagai NFKB. Bagaimana KURSI ditulis?', 'LVSTJ', 'LUSTJ', 'MVSTJ', 'LVSTK', 'LUTSK', 'A', 'Penalaran Analitis', 'medium'),
('Penalaran Umum', 1, 'Semua dokter adalah sarjana. Beberapa sarjana adalah atlet. Maka...', 'Semua dokter adalah atlet', 'Beberapa dokter mungkin atlet', 'Tidak ada dokter yang atlet', 'Semua atlet adalah dokter', 'Semua sarjana adalah dokter', 'B', 'Silogisme', 'medium'),
('Penalaran Umum', 1, '3, 7, 15, 31, 63, ... Angka selanjutnya adalah?', '95', '127', '111', '125', '129', 'B', 'Deret Angka', 'hard'),
('Penalaran Umum', 1, 'Jika hari ini Senin, maka 100 hari lagi adalah hari?', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'A', 'Penalaran Analitis', 'medium'),
('Penalaran Umum', 1, 'Lima orang duduk melingkar. A di kanan B. C berhadapan dengan A. D di kiri E. E di kanan C. Siapa di kiri B?', 'A', 'C', 'D', 'E', 'Tidak dapat ditentukan', 'D', 'Penalaran Spasial', 'hard');

-- Sample Questions for Pengetahuan & Pemahaman Umum Paket 1
INSERT INTO questions (subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, category, difficulty) VALUES
('Pengetahuan & Pemahaman Umum', 1, 'Pancasila disahkan sebagai dasar negara pada tanggal?', '17 Agustus 1945', '18 Agustus 1945', '1 Juni 1945', '22 Juni 1945', '29 Mei 1945', 'B', 'Sejarah', 'easy'),
('Pengetahuan & Pemahaman Umum', 1, 'Organ tubuh yang berfungsi menyaring darah adalah?', 'Hati', 'Paru-paru', 'Ginjal', 'Jantung', 'Limpa', 'C', 'Biologi', 'easy'),
('Pengetahuan & Pemahaman Umum', 1, 'Ibukota negara Australia adalah?', 'Sydney', 'Melbourne', 'Canberra', 'Perth', 'Brisbane', 'C', 'Geografi', 'easy'),
('Pengetahuan & Pemahaman Umum', 1, 'Rumus kimia air adalah?', 'CO2', 'H2O', 'NaCl', 'O2', 'H2SO4', 'B', 'Kimia', 'easy'),
('Pengetahuan & Pemahaman Umum', 1, 'Siapa penemu lampu pijar?', 'Nikola Tesla', 'Alexander Graham Bell', 'Thomas Alva Edison', 'Albert Einstein', 'Michael Faraday', 'C', 'Pengetahuan Umum', 'easy'),
('Pengetahuan & Pemahaman Umum', 1, 'Planet terbesar dalam tata surya adalah?', 'Saturnus', 'Jupiter', 'Uranus', 'Neptunus', 'Mars', 'B', 'Astronomi', 'easy'),
('Pengetahuan & Pemahaman Umum', 1, 'Berapa jumlah provinsi di Indonesia pada tahun 2024?', '34', '37', '38', '36', '35', 'C', 'Geografi', 'medium'),
('Pengetahuan & Pemahaman Umum', 1, 'Proses fotosintesis menghasilkan?', 'CO2 dan air', 'Glukosa dan O2', 'Protein dan lemak', 'CO2 dan O2', 'Air dan mineral', 'B', 'Biologi', 'easy'),
('Pengetahuan & Pemahaman Umum', 1, 'Konferensi Asia-Afrika pertama diadakan di kota?', 'Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Semarang', 'B', 'Sejarah', 'easy'),
('Pengetahuan & Pemahaman Umum', 1, 'Satuan SI untuk gaya adalah?', 'Joule', 'Watt', 'Newton', 'Pascal', 'Volt', 'C', 'Fisika', 'easy');

-- Sample Questions for Pemahaman Bacaan & Menulis Paket 1
INSERT INTO questions (subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, category, difficulty) VALUES
('Pemahaman Bacaan & Menulis', 1, 'Penggunaan tanda koma yang tepat terdapat pada kalimat...', 'Ibu membeli, sayur buah dan daging', 'Ibu membeli sayur, buah, dan daging', 'Ibu, membeli sayur buah dan daging', 'Ibu membeli sayur buah, dan daging', 'Ibu membeli sayur buah dan, daging', 'B', 'Tanda Baca', 'easy'),
('Pemahaman Bacaan & Menulis', 1, 'Kata baku dalam pilihan berikut adalah...', 'Aktifitas', 'Aktivitas', 'Aktipitas', 'Aktifites', 'Aktivites', 'B', 'Ejaan', 'easy'),
('Pemahaman Bacaan & Menulis', 1, 'Kalimat efektif adalah kalimat yang...', 'Menggunakan kata-kata berlebihan', 'Memiliki subjek dan predikat yang jelas', 'Terdiri dari banyak klausa', 'Menggunakan bahasa asing', 'Tidak memiliki objek', 'B', 'Kalimat Efektif', 'easy'),
('Pemahaman Bacaan & Menulis', 1, 'Gagasan utama paragraf biasanya terdapat pada...', 'Kalimat terakhir saja', 'Kalimat pertama atau terakhir', 'Kalimat kedua selalu', 'Di luar paragraf', 'Tidak pernah ada', 'B', 'Pemahaman Bacaan', 'easy'),
('Pemahaman Bacaan & Menulis', 1, 'Makna kata "ambigu" adalah...', 'Jelas', 'Bermakna ganda', 'Singkat', 'Panjang', 'Tegas', 'B', 'Kosakata', 'easy'),
('Pemahaman Bacaan & Menulis', 1, 'Penulisan kata depan yang benar adalah...', 'Dia pergi kesekolah', 'Dia pergi ke sekolah', 'Dia pergi keSekolah', 'Dia pergi Kesekolah', 'Dia pergi KE sekolah', 'B', 'Ejaan', 'easy'),
('Pemahaman Bacaan & Menulis', 1, 'Jenis paragraf yang menjelaskan proses terjadinya sesuatu disebut paragraf...', 'Deskripsi', 'Narasi', 'Eksposisi', 'Argumentasi', 'Persuasi', 'C', 'Jenis Paragraf', 'medium'),
('Pemahaman Bacaan & Menulis', 1, 'Konjungsi yang menyatakan hubungan sebab-akibat adalah...', 'dan', 'tetapi', 'karena', 'atau', 'serta', 'C', 'Konjungsi', 'easy'),
('Pemahaman Bacaan & Menulis', 1, 'Antonim dari kata "sementara" adalah...', 'Permanen', 'Sesaat', 'Sebentar', 'Singkat', 'Cepat', 'A', 'Kosakata', 'easy'),
('Pemahaman Bacaan & Menulis', 1, 'Kalimat yang mengandung majas personifikasi adalah...', 'Dia secepat kilat', 'Angin berbisik di telingaku', 'Wajahnya merah seperti tomat', 'Dia bagai bulan purnama', 'Hatinya sekeras batu', 'B', 'Majas', 'medium');

-- Sample Questions for Pengetahuan Kuantitatif Paket 1
INSERT INTO questions (subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, category, difficulty) VALUES
('Pengetahuan Kuantitatif', 1, 'Jika x + 3 = 7, maka nilai x adalah...', '2', '3', '4', '5', '6', 'C', 'Aljabar', 'easy'),
('Pengetahuan Kuantitatif', 1, 'Luas lingkaran dengan jari-jari 7 cm adalah... (pi = 22/7)', '154 cm2', '148 cm2', '144 cm2', '132 cm2', '156 cm2', 'A', 'Geometri', 'easy'),
('Pengetahuan Kuantitatif', 1, 'Rata-rata dari 4, 8, 12, 16, 20 adalah...', '10', '11', '12', '13', '14', 'C', 'Statistika', 'easy'),
('Pengetahuan Kuantitatif', 1, '25% dari 240 adalah...', '50', '55', '60', '65', '70', 'C', 'Aritmatika', 'easy'),
('Pengetahuan Kuantitatif', 1, 'Jika 2x - 5 = 11, maka nilai x adalah...', '6', '7', '8', '9', '10', 'C', 'Aljabar', 'easy'),
('Pengetahuan Kuantitatif', 1, 'Volume balok dengan panjang 5, lebar 3, dan tinggi 4 adalah...', '50', '55', '60', '65', '70', 'C', 'Geometri', 'easy'),
('Pengetahuan Kuantitatif', 1, 'Hasil dari 3^2 + 4^2 adalah...', '20', '25', '24', '23', '26', 'B', 'Aritmatika', 'easy'),
('Pengetahuan Kuantitatif', 1, 'Median dari data 3, 7, 5, 9, 1 adalah...', '3', '5', '7', '9', '1', 'B', 'Statistika', 'easy'),
('Pengetahuan Kuantitatif', 1, 'Keliling persegi dengan sisi 8 cm adalah...', '24 cm', '28 cm', '32 cm', '36 cm', '40 cm', 'C', 'Geometri', 'easy'),
('Pengetahuan Kuantitatif', 1, 'Faktor dari 12 adalah...', '1,2,3,4,6,12', '1,2,4,6,12', '1,3,4,6,12', '2,3,4,6,12', '1,2,3,6,12', 'A', 'Aritmatika', 'easy');

-- Sample Questions for Literasi Bahasa Indonesia Paket 1
INSERT INTO questions (subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, category, difficulty) VALUES
('Literasi Bahasa Indonesia', 1, 'Penulisan kata serapan yang benar adalah...', 'Sistim', 'System', 'Sistem', 'Systim', 'Cistem', 'C', 'Ejaan', 'easy'),
('Literasi Bahasa Indonesia', 1, 'Sinonim dari kata "komprehensif" adalah...', 'Singkat', 'Menyeluruh', 'Sebagian', 'Terbatas', 'Dangkal', 'B', 'Kosakata', 'medium'),
('Literasi Bahasa Indonesia', 1, 'Kalimat pasif dari "Ani menulis surat" adalah...', 'Surat menulis Ani', 'Surat ditulis oleh Ani', 'Ani ditulis surat', 'Surat ditulis Ani oleh', 'Menulis surat oleh Ani', 'B', 'Tata Bahasa', 'easy'),
('Literasi Bahasa Indonesia', 1, 'Fungsi kata "yang" pada kalimat "Buku yang saya baca sangat menarik" adalah...', 'Konjungsi', 'Preposisi', 'Pronomina relatif', 'Adverbia', 'Artikula', 'C', 'Tata Bahasa', 'medium'),
('Literasi Bahasa Indonesia', 1, 'Kata berimbuhan yang tepat dari kata dasar "kerja" adalah...', 'Mengerjakan', 'Mengkerjakan', 'Mengerjain', 'Dikerjain', 'Kerjakan', 'A', 'Morfologi', 'easy'),
('Literasi Bahasa Indonesia', 1, 'Penggunaan huruf kapital yang benar terdapat pada...', 'saya tinggal di jakarta', 'Saya Tinggal Di Jakarta', 'Saya tinggal di Jakarta', 'saya Tinggal di Jakarta', 'SAYA TINGGAL DI JAKARTA', 'C', 'Ejaan', 'easy'),
('Literasi Bahasa Indonesia', 1, 'Makna istilah "inflasi" adalah...', 'Penurunan harga', 'Kenaikan harga secara umum', 'Kestabilan harga', 'Penurunan produksi', 'Kenaikan produksi', 'B', 'Kosakata', 'medium'),
('Literasi Bahasa Indonesia', 1, 'Jenis kalimat "Tolong ambilkan buku itu!" adalah...', 'Kalimat berita', 'Kalimat tanya', 'Kalimat perintah', 'Kalimat seru', 'Kalimat majemuk', 'C', 'Tata Bahasa', 'easy'),
('Literasi Bahasa Indonesia', 1, 'Perbedaan "di mana" dan "dimana" adalah...', 'Tidak ada perbedaan', '"di mana" untuk pertanyaan tempat, "dimana" tidak baku', '"dimana" lebih formal', 'Keduanya tidak baku', '"di mana" tidak baku', 'B', 'Ejaan', 'medium'),
('Literasi Bahasa Indonesia', 1, 'Unsur intrinsik cerpen meliputi...', 'Latar belakang pengarang', 'Tema, tokoh, alur, latar, amanat', 'Biografi pengarang', 'Tahun terbit', 'Penerbit buku', 'B', 'Sastra', 'easy');

-- Sample Questions for Literasi Bahasa Inggris Paket 1
INSERT INTO questions (subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, category, difficulty) VALUES
('Literasi Bahasa Inggris', 1, 'Choose the correct sentence:', 'She go to school every day', 'She goes to school every day', 'She going to school every day', 'She gone to school every day', 'She went to school every day always', 'B', 'Grammar', 'easy'),
('Literasi Bahasa Inggris', 1, 'The synonym of "abundant" is...', 'Scarce', 'Plentiful', 'Limited', 'Rare', 'Few', 'B', 'Vocabulary', 'medium'),
('Literasi Bahasa Inggris', 1, 'Choose the correct passive form of "They built this house in 1990":', 'This house built in 1990', 'This house was built in 1990', 'This house is built in 1990', 'This house had built in 1990', 'This house being built in 1990', 'B', 'Grammar', 'easy'),
('Literasi Bahasa Inggris', 1, '"I have been studying for three hours." This sentence uses which tense?', 'Present Simple', 'Past Simple', 'Present Perfect Continuous', 'Past Perfect', 'Future Perfect', 'C', 'Grammar', 'medium'),
('Literasi Bahasa Inggris', 1, 'The antonym of "optimistic" is...', 'Hopeful', 'Cheerful', 'Pessimistic', 'Positive', 'Confident', 'C', 'Vocabulary', 'easy'),
('Literasi Bahasa Inggris', 1, 'Choose the correct word: "She is ___ than her sister."', 'more tall', 'taller', 'tallest', 'most tall', 'tall', 'B', 'Grammar', 'easy'),
('Literasi Bahasa Inggris', 1, 'What does the idiom "break the ice" mean?', 'Destroy something', 'Start a conversation in a social setting', 'Make ice cubes', 'Break a promise', 'Cool down', 'B', 'Idioms', 'medium'),
('Literasi Bahasa Inggris', 1, 'The correct preposition: "She is interested ___ learning English."', 'on', 'at', 'in', 'for', 'to', 'C', 'Grammar', 'easy'),
('Literasi Bahasa Inggris', 1, '"Despite the rain, we went to the park." What does "despite" mean?', 'Because of', 'In addition to', 'In spite of', 'Due to', 'Thanks to', 'C', 'Vocabulary', 'easy'),
('Literasi Bahasa Inggris', 1, 'Choose the correctly punctuated sentence:', 'Its a beautiful day isnt it', 'Its a beautiful day, isnt it?', 'It''s a beautiful day, isn''t it?', 'Its'' a beautiful day isn''t it', 'It''s a beautiful day isnt it', 'C', 'Punctuation', 'medium');

-- Sample Questions for Penalaran Matematika Paket 1
INSERT INTO questions (subtest, package_number, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, category, difficulty) VALUES
('Penalaran Matematika', 1, 'Jika f(x) = 2x + 3, maka f(5) = ...', '10', '13', '15', '8', '11', 'B', 'Fungsi', 'easy'),
('Penalaran Matematika', 1, 'Turunan dari f(x) = 3x^2 + 2x - 1 adalah...', '6x + 2', '3x + 2', '6x - 2', '6x^2 + 2', '3x^2 + 2', 'A', 'Kalkulus', 'medium'),
('Penalaran Matematika', 1, 'Nilai dari log10(1000) adalah...', '1', '2', '3', '4', '10', 'C', 'Logaritma', 'easy'),
('Penalaran Matematika', 1, 'Persamaan garis yang melalui titik (2,3) dengan gradien 4 adalah...', 'y = 4x + 5', 'y = 4x - 5', 'y = 4x + 3', 'y = 4x - 3', 'y = 4x + 11', 'B', 'Geometri Analitik', 'medium'),
('Penalaran Matematika', 1, 'Berapa banyak cara menyusun 3 huruf dari kata "ABCD"?', '12', '24', '4', '6', '8', 'B', 'Kombinatorik', 'medium'),
('Penalaran Matematika', 1, 'Nilai sin 30 derajat adalah...', '1', '1/2', 'akar(2)/2', 'akar(3)/2', '0', 'B', 'Trigonometri', 'easy'),
('Penalaran Matematika', 1, 'Akar-akar persamaan x^2 - 5x + 6 = 0 adalah...', 'x = 1 dan x = 6', 'x = 2 dan x = 3', 'x = -2 dan x = -3', 'x = 1 dan x = 5', 'x = -1 dan x = 6', 'B', 'Aljabar', 'easy'),
('Penalaran Matematika', 1, 'Suku ke-10 dari barisan aritmatika 3, 7, 11, 15, ... adalah...', '39', '40', '41', '42', '43', 'A', 'Barisan dan Deret', 'medium'),
('Penalaran Matematika', 1, 'Integral dari integral(2x) dx adalah...', 'x^2 + C', '2x^2 + C', 'x + C', '2 + C', 'x^2/2 + C', 'A', 'Kalkulus', 'medium'),
('Penalaran Matematika', 1, 'Probabilitas mendapatkan angka genap dari pelemparan satu dadu adalah...', '1/6', '1/3', '1/2', '2/3', '1/4', 'C', 'Probabilitas', 'easy');
