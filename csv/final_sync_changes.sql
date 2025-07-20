-- Final Database Synchronization Script
-- Generated: 2025-07-14 13:32:13
-- IMPORTANT: Review before executing

-- ========== NEW CLASSROOMS ==========
INSERT INTO classrooms (code, name, capacity, type, is_available) VALUES ('G.2.2', 'G.2.2', 30, 'taller', true);
INSERT INTO classrooms (code, name, capacity, type, is_available) VALUES ('L.1.4', 'L.1.4', 30, 'informatica', true);
INSERT INTO classrooms (code, name, capacity, type, is_available) VALUES ('P.0.1', 'P.0.1', 30, 'teoria', true);
INSERT INTO classrooms (code, name, capacity, type, is_available) VALUES ('P.0.2/0', 'P.0.2/0', 30, 'teoria', true);
INSERT INTO classrooms (code, name, capacity, type, is_available) VALUES ('P.0.5/0', 'P.0.5/0', 30, 'teoria', true);

-- ========== NEW TEACHERS ==========
-- NOTE: Review and update email addresses
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_849', 'Laura', 'Ginés', 'laura.ginés@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_764', 'Marta', 'Camps', 'marta.camps@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_855', 'Marina', 'Riera', 'marina.riera@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_992', 'Alejandra', 'López Gabrielidis', 'alejandra.lópezgabrielidis@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_962', 'Glòria', 'Deumal Ricard Marimon Daniel Tahmaz', 'glòria.deumalricardmarimondanieltahmaz@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_969', 'Glòria', 'Deumal Elisenda Fontarnau Pau Pericas', 'glòria.deumalelisendafontarnaupaupericas@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_862', 'Nico', 'Juárez', 'nico.juárez@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_199', 'Mª', 'Isabel del Río', 'mª.isabeldelrío@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_325', 'Laura', 'Subirats', 'laura.subirats@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_538', 'Mª', 'Àngels Fortea', 'mª.àngelsfortea@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_716', 'Arnau', 'Pi Adrià Molins', 'arnau.piadriàmolins@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_084', 'Luis', 'Colaço Jose Ramon Madrid', 'luis.colaçojoseramonmadrid@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_789', 'Roger', 'Vicente', 'roger.vicente@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_142', 'Ricardo', 'Íscar', 'ricardo.íscar@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_698', 'Àlex', 'Valverde Jorge Caballero Mª José Díaz', 'àlex.valverdejorgecaballeromªjosédíaz@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_516', 'Núria', 'Nia', 'núria.nia@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_887', 'Albert', 'Gavaldà', 'albert.gavaldà@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_694', 'Sílvia', 'Rosés', 'sílvia.rosés@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_245', 'Claudio', 'Marzà Portàtils (octubre)', 'claudio.marzàportàtils(octubre)@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_234', 'Elisa', 'Amann', 'elisa.amann@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_995', 'Nataly', 'dal Pozzo', 'nataly.dalpozzo@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_823', 'Raül', 'Maldonado', 'raül.maldonado@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_568', 'Mónica', 'Rikic Luis Colaço', 'mónica.rikicluiscolaço@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_632', 'Laura', 'Ginés Núria Nia Taller Interactiu', 'laura.ginésnúrianiatallerinteractiu@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_314', 'Núria', 'Costa', 'núria.costa@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_282', 'Patronatge', 'IV Marta Morralla Pt.2', 'patronatge.ivmartamorrallapt.2@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_629', 'Kike', 'Macías', 'kike.macías@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_551', 'Lara', 'Fluxà', 'lara.fluxà@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_585', 'Blanca', 'Gracia Jonathan Millán', 'blanca.graciajonathanmillán@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_842', 'Pere', 'Llobera', 'pere.llobera@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_080', 'Mònica', 'Rikic Luis Colaço Sala Carolines', 'mònica.rikicluiscolaçosalacarolines@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_788', 'Rafa', 'Marcos Mota', 'rafa.marcosmota@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_055', 'Daniel', 'Pitarch Pau Artigas', 'daniel.pitarchpauartigas@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_821', 'Taller', 'de Dibuix I', 'taller.dedibuixi@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_513', 'Pensament', 'Modern i Pràctiques Artístiques', 'pensament.modernipràctiquesartístiques@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_299', 'Oriol', 'Vilapuig', 'oriol.vilapuig@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_883', 'David', 'Ortiz Irene Visa', 'david.ortizirenevisa@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_721', 'Serafín', 'Álvarez Ariadna Guiteras Sala Carolines', 'serafín.álvarezariadnaguiterassalacarolines@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_765', 'Federica', 'Matelli', 'federica.matelli@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_898', 'tutoriesSala', 'Carolines', 'tutoriessala.carolines@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_197', 'Taller', 'de Dibuix IINúria Inés', 'taller.dedibuixiinúriainés@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_914', 'Art,', 'Institució i Mercat', 'art,.institucióimercat@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_155', 'Jonathan', 'Millán', 'jonathan.millán@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_973', 'Ludovica', 'Carbotta Julieta Dentone', 'ludovica.carbottajulietadentone@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_488', 'Lúa', 'Coderch', 'lúa.coderch@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_805', 'Pep', 'Vidal', 'pep.vidal@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_511', 'XD,', 'Llenguatges,Tecniquesi Tecnologies', 'xd,.llenguatges,tecniquesitecnologies@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_620', 'Art,', 'Activisme, Mediació i Peda­ gogia', 'art,.activisme,mediacióipeda­gogia@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_407', 'Daniel', 'Pitarch Paula Bruna', 'daniel.pitarchpaulabruna@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_907', 'Lara', 'Fluxa Mercedes Pimiento', 'lara.fluxamercedespimiento@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_307', 'Laboratori', 'de Processosi Projectes IV', 'laboratori.deprocessosiprojectesiv@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_582', 'Jaron', 'Rowan Silvia Zayas', 'jaron.rowansilviazayas@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_287', 'Art', 'Practices in Context Seminar I', 'art.practicesincontextseminari@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_363', 'Sergi', 'Alvarez', 'sergi.alvarez@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_197', 'Metodologies', 'Transdisciplinàries i Experimentals', 'metodologies.transdisciplinàriesiexperimentals@bau.cat', 20);
INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('T250714_761', 'Lúa', 'Corderch', 'lúa.corderch@bau.cat', 20);

-- ========== NEW SUBJECTS ==========
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_8728', 'Anna Moreno G0.1', 6, 3, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_5181', 'd’Artista', 3, 3, 'optativa', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_4544', 'Daniel Pitarch Paula Bruna G2.1', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA1_5722', 'David Ortiz Irene Visa L0.2', 6, 1, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_1877', 'Debats Contemporanis en les Arts i les Ciències Socials', 3, 3, 'optativa', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_1834', 'Debats Contemporanis en les Arts i les Humanitats', 3, 3, 'optativa', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_3084', 'Debats Contemporanis en les Arts, les Ciències i les Tecnologies', 3, 3, 'optativa', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_0416', 'Eulalia Rovira Michael Lawton Gl.3', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA1_5736', 'Federica Matelli P0.6', 6, 1, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA4_0374', 'Federica Matelli10:00 P0.6', 6, 4, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GDI3_8907', 'Gm1a
David Torrents P1.7', 6, 3, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_5390', 'Irena Visa G.2.2', 6, 3, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_8043', 'Jaron Rowan Silvia Zayas G2.1', 6, 3, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_4111', 'Jaume Ferrete Vázquez Agustín Ortiz HerreraSala Carolines', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA1_1047', 'Jonathan Millán G1.2', 6, 1, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_9675', 'Juan David Galindo', 3, 3, 'optativa', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_6306', 'Lara Fluxa Mercedes Pimiento G0.3', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA4_3813', 'Lúa Coderch Anna Moreno Michael Lawton G1.2', 6, 4, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA1_9330', 'Lúa Coderch G0.2', 6, 1, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA4_3051', 'Lúa Corderch G2.2', 6, 4, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA1_7745', 'Ludovica Carbotta Julieta Dentone G0.3', 6, 1, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_9906', 'Luz Broto Gl.3', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_5787', 'Mafe Moscoso P0.10', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA1_8168', 'Mariona Moncunill P0.2/0.4', 6, 1, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_8741', 'Núria Gómez GabrielPO.a', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA1_9598', 'Oriol Vilapuig L0.1', 6, 1, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_0583', 'Pep Vidal G2.1', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_1631', 'Pràctiques  Crítiques en les Arts i les Humanitats', 3, 3, 'optativa', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_0270', 'Pràctiques Crítiques  en les Arts i les Ciències Socials', 3, 3, 'optativa', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_4282', 'Pràctiques Crítiques  en les Arts, les Ciències i les Tecnologies', 3, 3, 'optativa', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_5104', 'Quim Packard Pl.5', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA1_9101', 'Rebecca Gil Rasmus Nilausen G1.2', 6, 1, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA2_0947', 'Regina Gimenez Anna Clemente L0.4 (5 sessions) Gl.2', 6, 2, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA1_4721', 'Serafín Álvarez Ariadna Guiteras Sala Carolines', 6, 1, 'obligatoria', NULL);
INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES ('GBA3_1966', 'Sergi Alvarez L0.1', 6, 3, 'obligatoria', NULL);

-- ========== ITINERARI UPDATES ==========
UPDATE subjects SET itinerari = 'Web' WHERE id = '9ca88e73-3e28-461c-b00d-f704d289bb53';
UPDATE subjects SET itinerari = 'Web' WHERE id = '2ede690e-680c-4e3a-84a1-2ce61f5e412e';
UPDATE subjects SET itinerari = 'Web' WHERE id = '5795405c-1e71-4d17-942c-c9021b37e16c';
UPDATE subjects SET itinerari = 'Web' WHERE id = '7cec98ec-95be-4620-af61-78ab55528c5c';
UPDATE subjects SET itinerari = 'Web' WHERE id = '848e27fb-cbf2-4143-b152-9089b0d3ea3a';
UPDATE subjects SET itinerari = 'Web' WHERE id = '8113a657-1a2f-4e3b-8e8b-8648296776f8';
UPDATE subjects SET itinerari = 'Web' WHERE id = 'b9d90ceb-81e6-47db-b4b8-c0cd46253d88';
UPDATE subjects SET itinerari = 'Gràfic' WHERE id = '288d911b-0641-4063-a4f6-75251bd9b52d';
UPDATE subjects SET itinerari = 'Gràfic' WHERE id = '900373a1-88b1-44bb-9d25-69afe6e2a082';
UPDATE subjects SET itinerari = 'Web' WHERE id = '7dc69e4b-3f3d-4648-9303-e556a34ed82e';
UPDATE subjects SET itinerari = 'Audiovisual' WHERE id = '496d0baa-3a6a-48a7-bb8f-747ca861c6d2';
UPDATE subjects SET itinerari = 'Audiovisual' WHERE id = '25585b59-bda7-4a21-962e-c3e1bfe807e2';
UPDATE subjects SET itinerari = 'Tipografia' WHERE id = '33003480-646b-4f2c-9582-e75fbc6d8032';
