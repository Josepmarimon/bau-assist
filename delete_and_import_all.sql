-- 1. PRIMER: Eliminar totes les assignatures existents
DELETE FROM subjects;

-- 2. DESPRÉS: Importar totes les 101 assignatures úniques
-- (Aquest SQL només inclou les assignatures úniques, sense duplicats)

INSERT INTO subjects (
    id, code, name, credits, year, type, degree, 
    "ID Itinerari", "Area Coord", active
) VALUES 
    -- DISSENY - 1r curs
    ('550e8400-e29b-41d4-a716-446655440001', 'GDF001', 'Història del Disseny i l''Art Contemporani I', 6, 1, 'obligatoria', 'Disseny', NULL, 'CULT', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'GDF011', 'Dibuix I', 6, 1, 'obligatoria', 'Disseny', NULL, 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440003', 'GDF021', 'Projectes I', 6, 1, 'obligatoria', 'Disseny', NULL, 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440004', 'GDF031', 'Filosofia i Estètica', 6, 1, 'obligatoria', 'Disseny', NULL, 'CULT', true),
    ('550e8400-e29b-41d4-a716-446655440005', 'GDF041', 'Introducció al Disseny', 6, 1, 'obligatoria', 'Disseny', NULL, 'CULT', true),
    ('550e8400-e29b-41d4-a716-446655440006', 'GDF002', 'Història del Disseny i l''Art Contemporani II', 6, 1, 'obligatoria', 'Disseny', NULL, 'CULT', true),
    ('550e8400-e29b-41d4-a716-446655440007', 'GDF012', 'Dibuix II', 6, 1, 'obligatoria', 'Disseny', NULL, 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440008', 'GDF022', 'Projectes II', 6, 1, 'obligatoria', 'Disseny', NULL, 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440009', 'GDF032', 'Teoria i Comunicació', 6, 1, 'obligatoria', 'Disseny', NULL, 'CULT', true),
    ('550e8400-e29b-41d4-a716-446655440010', 'GDF042', 'Introducció a l''Espai', 6, 1, 'obligatoria', 'Disseny', NULL, 'EINES', true),

    -- DISSENY - 2n curs
    ('550e8400-e29b-41d4-a716-446655440011', 'GDB001', 'Eines Digitals I', 6, 2, 'obligatoria', 'Disseny', NULL, 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440012', 'GDB011', 'Eines Digitals II', 6, 2, 'obligatoria', 'Disseny', NULL, 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440013', 'GDB021', 'Introducció a la Tipografia', 6, 2, 'obligatoria', 'Disseny', NULL, 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440014', 'GDB031', 'Disseny i Societat', 6, 2, 'obligatoria', 'Disseny', NULL, 'CULT', true),
    ('550e8400-e29b-41d4-a716-446655440015', 'GDB041', 'Cultura del Disseny', 6, 2, 'obligatoria', 'Disseny', NULL, 'CULT', true),
    ('550e8400-e29b-41d4-a716-446655440016', 'GDB002', 'Laboratori II', 6, 2, 'obligatoria', 'Disseny', NULL, 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440017', 'GDB012', 'Eines Visuals II', 6, 2, 'obligatoria', 'Disseny', NULL, 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440018', 'GDB022', 'Tipografia II', 6, 2, 'obligatoria', 'Disseny', NULL, 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440019', 'GDB032', 'Projectes de Disseny I', 6, 2, 'obligatoria', 'Disseny', NULL, 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440020', 'GDB042', 'Metodologia del Disseny', 6, 2, 'obligatoria', 'Disseny', NULL, 'CULT', true),

    -- DISSENY GRÀFIC - 3r i 4t curs
    ('550e8400-e29b-41d4-a716-446655440021', 'GDVG03', 'Projectes de Disseny Gràfic I', 6, 3, 'obligatoria', 'Disseny', 'G', 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440022', 'GDVG13', 'Taller de Gràfic i Comunicació Visual I', 6, 3, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440023', 'GDVG23', 'Disseny Editorial', 6, 3, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440024', 'GDVG33', 'Il·lustració i Fotografia', 6, 3, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440025', 'GDVG43', 'Disseny d''Identitat', 6, 3, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440026', 'GDVG53', 'Projectes de Disseny Gràfic II', 6, 3, 'obligatoria', 'Disseny', 'G', 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440027', 'GDVG63', 'Taller de Gràfic i Comunicació Visual II', 6, 3, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440028', 'GDVG73', 'Packaging', 6, 3, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440029', 'GDVG83', 'Senyalètica', 6, 3, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440030', 'GDVG93', 'Autoedició', 6, 3, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('023aeba9-6007-40c2-9f2d-8034eea896a9', 'GDVG04', 'Projectes de Disseny Gràfic III', 6, 4, 'obligatoria', 'Disseny', 'G', 'PROJ', true),
    ('178a8bc4-0cbe-4f59-9e6f-9bca0aaec12e', 'GDVG14', 'Taller de Gràfic i Comunicació Visual III', 6, 4, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('822ef473-277a-4817-8c19-afef87051eda', 'GDVG24', 'Disseny i Comunicació', 6, 4, 'obligatoria', 'Disseny', 'G', 'CULT', true),
    ('a8d51218-8182-4636-a6b6-8d3790d6ad49', 'GDVG34', 'Introducció al Disseny Web', 6, 4, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('d10c5c24-7364-4923-a52a-7e7cdb88669f', 'GDVG44', 'Programació per Dissenyadors', 6, 4, 'obligatoria', 'Disseny', 'G', 'EINES', true),
    ('c6a8ce2c-9bf8-466a-9945-6272e9dfac2b', 'GDVG54', 'Disseny i Publicitat', 6, 4, 'obligatoria', 'Disseny', 'G', 'CULT', true),

    -- DISSENY D'INTERIORS - 3r i 4t curs
    ('550e8400-e29b-41d4-a716-446655440031', 'GDVI03', 'Projectes de Disseny d''Interiors I', 6, 3, 'obligatoria', 'Disseny', 'I', 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440032', 'GDVI13', 'Taller d''Espai I', 6, 3, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440033', 'GDVI23', 'Construcció i Instal·lacions I', 6, 3, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440034', 'GDVI33', 'Disseny d''Il·luminació', 6, 3, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440035', 'GDVI43', 'Escenografia', 6, 3, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440036', 'GDVI53', 'Projectes de Disseny d''Interiors II', 6, 3, 'obligatoria', 'Disseny', 'I', 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440037', 'GDVI63', 'Taller d''Espai II', 6, 3, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440038', 'GDVI73', 'Construcció i Instal·lacions II', 6, 3, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440039', 'GDVI83', 'Mobiliari', 6, 3, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440040', 'GDVI93', 'Aparadorisme', 6, 3, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('3a5609b8-ed82-4b75-8dad-762180a05e01', 'GDVI04', 'Projectes de Disseny d''Interiors III', 6, 4, 'obligatoria', 'Disseny', 'I', 'PROJ', true),
    ('997647ac-8006-48f6-bbed-b865fbddeda2', 'GDVI14', 'Taller d''Espai III', 6, 4, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('f53a5d6a-788e-495c-b5e7-5c89f190d974', 'GDVI24', 'Construcció i Instal·lacions III', 6, 4, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('42039be7-ff47-4df5-a576-5207727ec82c', 'GDVI34', 'Producte', 6, 4, 'obligatoria', 'Disseny', 'I', 'EINES', true),
    ('e28da6af-f649-478b-8413-93ca14182112', 'GDVI44', 'Gestió', 6, 4, 'obligatoria', 'Disseny', 'I', 'CULT', true),
    ('f479067f-6114-417c-990c-3f7fa74838ad', 'GDVI54', 'Construcció i Instal·lacions IV', 6, 4, 'obligatoria', 'Disseny', 'I', 'EINES', true),

    -- DISSENY DE MODA - 3r i 4t curs
    ('213e167d-2708-419c-a193-29ad24ffbf28', 'GDVM03', 'Projectes de Disseny de Moda I', 6, 3, 'obligatoria', 'Disseny', 'M', 'PROJ', true),
    ('8ede2547-9c78-4661-bc3b-9b617009b3f2', 'GDVM13', 'Taller de Moda I', 6, 3, 'obligatoria', 'Disseny', 'M', 'EINES', true),
    ('1758f60e-8759-4e84-9d67-8238be35cd4c', 'GDVM23', 'Anàlisi i Teoria dels Teixits', 6, 3, 'obligatoria', 'Disseny', 'M', 'EINES', true),
    ('a076df83-06ec-4227-b2b9-89a7bf6f69db', 'GDVM33', 'Història de la Moda I', 6, 3, 'obligatoria', 'Disseny', 'M', 'CULT', true),
    ('e70b9b8e-b4e5-4f8d-aaeb-5d8fd0d0921e', 'GDVM43', 'Patronatge I', 6, 3, 'obligatoria', 'Disseny', 'M', 'EINES', true),
    ('8f0c90b0-051e-43fe-9f20-3d3b9fdd5ea9', 'GDVM53', 'Projectes de Disseny de Moda II', 6, 3, 'obligatoria', 'Disseny', 'M', 'PROJ', true),
    ('8656c505-72f5-468b-8e24-fc7b404a8308', 'GDVM63', 'Taller de Moda II', 6, 3, 'obligatoria', 'Disseny', 'M', 'EINES', true),
    ('da01010a-67e8-4558-b4ff-5bdb06a73996', 'GDVM73', 'Imatge i Comunicació', 6, 3, 'obligatoria', 'Disseny', 'M', 'CULT', true),
    ('45ef8c69-7319-4c51-be39-b704f4e6c815', 'GDVM83', 'Història de la Moda II', 6, 3, 'obligatoria', 'Disseny', 'M', 'CULT', true),
    ('b6a158a6-fa59-4462-b36f-1225e7966c39', 'GDVM93', 'Patronatge II', 6, 3, 'obligatoria', 'Disseny', 'M', 'EINES', true),
    ('9ed751d8-12e5-4940-83bb-2d60dbc9e288', 'GDVM04', 'Projectes de Disseny de Moda III', 6, 4, 'obligatoria', 'Disseny', 'M', 'PROJ', true),
    ('da77f92c-c9e5-4212-9362-cb70babca8a1', 'GDVM14', 'Taller de Moda III', 6, 4, 'obligatoria', 'Disseny', 'M', 'EINES', true),
    ('0e58257c-79c9-4aaa-8cb5-37a91ca92acb', 'GDVM24', 'Patronatge III', 6, 4, 'obligatoria', 'Disseny', 'M', 'EINES', true),
    ('140a67da-592d-46b7-8757-0b0d7075fd48', 'GDVM34', 'Manipulació i Estampació de Teixits', 6, 4, 'obligatoria', 'Disseny', 'M', 'EINES', true),
    ('daed7ccc-7156-4af6-9a7b-ebba41b17aa6', 'GDVM44', 'Màrqueting i Moda', 6, 4, 'obligatoria', 'Disseny', 'M', 'CULT', true),
    ('326d5960-d660-4820-b2da-e0871761356f', 'GDVM54', 'Patronatge IV', 6, 4, 'obligatoria', 'Disseny', 'M', 'EINES', true),

    -- DISSENY AUDIOVISUAL - 3r i 4t curs
    ('550e8400-e29b-41d4-a716-446655440041', 'GDVA03', 'Animació Digital I', 6, 3, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440042', 'GDVA13', 'Creació i Autoria Digital I', 6, 3, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440043', 'GDVA23', 'Projectes de Disseny Audiovisual I', 6, 3, 'obligatoria', 'Disseny', 'A', 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440044', 'GDVA33', 'Taller d''Audiovisual I', 6, 3, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440045', 'GDVA43', 'Narrativa Audiovisual', 6, 3, 'obligatoria', 'Disseny', 'A', 'CULT', true),
    ('550e8400-e29b-41d4-a716-446655440046', 'GDVA53', 'Animació Digital II', 6, 3, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440047', 'GDVA63', 'Creació i Autoria Digital II', 6, 3, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440048', 'GDVA73', 'Projectes de Disseny Audiovisual II', 6, 3, 'obligatoria', 'Disseny', 'A', 'PROJ', true),
    ('550e8400-e29b-41d4-a716-446655440049', 'GDVA83', 'Taller d''Audiovisual II', 6, 3, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('550e8400-e29b-41d4-a716-446655440050', 'GDVA93', 'So Digital', 6, 3, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('d5c6d038-036e-4931-bd89-06eae5662e78', 'GDVA04', 'Animació Digital III', 6, 4, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('a101d698-129e-4416-bb59-29cf07bce7f2', 'GDVA14', 'Creació i Autoria Digital III', 6, 4, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('3e9268a7-0e5a-4ad4-8de0-2e23023e3a4e', 'GDVA24', 'Projectes de Disseny Audiovisual III', 6, 4, 'obligatoria', 'Disseny', 'A', 'PROJ', true),
    ('81db274d-3325-41be-b0d1-6a25479519db', 'GDVA34', 'Taller d''Audiovisual III', 6, 4, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('0f9a76da-bb0e-4b1f-b626-5b8fdf23e1ae', 'GDVA44', 'Tipografia en Moviment', 6, 4, 'obligatoria', 'Disseny', 'A', 'EINES', true),
    ('bff2f91c-b985-49d4-aaf8-14ccfb5a5d31', 'GDVA54', 'Creació i Autoria Digital IV', 6, 4, 'obligatoria', 'Disseny', 'A', 'EINES', true),

    -- DISSENY - 4t curs (TFG)
    ('727a1bda-4ff2-4661-8fdb-993fc2928d14', 'GDT074', 'Treball Final de Grau', 12, 4, 'obligatoria', 'Disseny', NULL, 'PROJ', true),

    -- BELLES ARTS - 1r curs
    ('fca3f98e-ca5c-43b6-87af-5b8c851f60a2', 'GBB001', '2D, Llenguatges, Tècniques i Tecnologies', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('fee0bc4c-5a6a-417f-b895-3c23197e6b10', 'GBB011', '4D, Llenguatges, Tècniques i Tecnologies', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('bcbd3b8d-66ff-47c5-939e-d5c13e9d269e', 'GBB021', '3D, Llenguatges, Tècniques i Tecnologies', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('2c80bc23-5cd6-4478-9b70-d5afc825eeab', 'GBB031', 'Laboratori de Processos i Projectes I', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('5e720d05-d781-4953-96b1-58ae884a9528', 'GBF001', 'Pensament Modern i Pràctiques Artístiques', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('0ef91978-2325-4021-ad4d-60d3bf8436d8', 'GBF011', 'Taller de Dibuix I', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('1893fa1f-0c8c-4702-8cf9-0d9cab8d6679', 'GBF021', 'Visualisation and Documentation Workshop', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('e5429cb8-576d-41a2-923f-56ebf42386f0', 'GBF031', 'Estètica', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('aed9e01e-2406-4a7c-bbbc-7c2d51340f99', 'GBF041', 'Taller de Dibuix II', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('254d5891-f5bc-495d-b771-9d0a9655c995', 'GBF051', 'Art, Institució i Mercat', 6, 1, 'obligatoria', 'Belles Arts', NULL, NULL, true),

    -- BELLES ARTS - 2n curs
    ('9971d2c8-5e34-4a7f-9200-191f26e3fe7a', 'GBB002', '2D, Llenguatges, Tècniques i Tecnologies Instal·lades', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('ba1d060e-015c-4259-8078-1471912ca80a', 'GBB012', '4D, Llenguatges, Tècniques i Tecnologies Instal·lades', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('8661b3dd-a696-4a78-9074-0ec270efa21f', 'GBB022', 'Laboratori de Processos i Projectes II', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('ae5d2b61-c91e-4b38-a81d-4491ce0d96e9', 'GBB032', '3D, Llenguatges, Tècniques i Tecnologies Instal·lades', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('d770aa47-f32d-4102-a92d-317236e925ea', 'GBB042', 'XD, Llenguatges, Tècniques i Tecnologies', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('eb49abef-e17a-4364-80f7-50f1d8ca773f', 'GBB052', 'Laboratori de Processos i Projectes III', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('fa0be4b4-6e7f-41ea-bccc-f2e4547beae1', 'GBF002', 'Pensament Contemporani i Pràctiques Artístiques', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('62ba49f3-f51d-4fde-be8e-259709b239a2', 'GBF012', 'Writing and Communication Workshop', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('53947c9e-9e08-4191-a836-e88a3f6d6d13', 'GBF022', 'Antropologia', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('23ab9384-70be-4b4e-b3cb-1a03d1742136', 'GBF032', 'Art, Activisme, Mediació i Pedagogia', 6, 2, 'obligatoria', 'Belles Arts', NULL, NULL, true),

    -- BELLES ARTS - 3r curs
    ('86bc6f0a-a215-40e5-96fe-243fb6c16cee', 'GBB003', 'Pràctiques Artístiques i Investigació', 6, 3, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('5cc7ab4f-9983-4624-8c40-7f260eb4dac4', 'GBB013', 'Laboratori de Processos i Projectes IV', 6, 3, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('4d8a3433-6bf5-4310-8b77-a3ef35f97767', 'GBB023', 'Art Practices in Context Seminar I', 6, 3, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('2f221fcf-2c7b-4570-bded-23c176689551', 'GBB033', 'Laboratori de Processos i Projectes V', 6, 3, 'obligatoria', 'Belles Arts', NULL, NULL, true),

    -- BELLES ARTS - 4t curs
    ('bee158a2-eb11-4f3b-8903-09e8a9849d2a', 'GBB004', 'Art Practices in Context Seminar II ', 6, 4, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('61b3ee09-7015-455a-ace5-cc8fb7cc6408', 'GBB024', 'Laboratori de Processos i Projectes VI', 6, 4, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('86c3d691-491c-46f6-b1f2-bf3f79630303', 'GBB014', 'Metodologies Transdisciplinàries i Experimentals', 6, 4, 'obligatoria', 'Belles Arts', NULL, NULL, true),
    ('bcf1c513-b0cc-43f9-a2fd-4baf69249c99', 'GBT004', 'Treball de Fi de Grau', 12, 4, 'obligatoria', 'Belles Arts', NULL, NULL, true);