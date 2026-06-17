-- Llista inicial de tribunals extreta del Field Group ACF (group_64351aea8e4c5).
-- L'admin pot modificar-la, afegir-ne, desactivar-ne o esborrar-ne des del backoffice
-- abans d'enviar els magic links als estudiants.
--
-- Convenció dels codis:
--   AV* = Disseny Audiovisual
--   E*  = Disseny Espais
--   M*  = Disseny Moda
--   G*  = Disseny Gràfic

INSERT INTO public.tfg_tribunals (name, itinerari, display_order) VALUES
  ('AV1. #Disseny #Crític #Especulatiu #Processual', 'Disseny Audiovisual', 10),
  ('AV2. #Experimentació #Material #Tècnica',         'Disseny Audiovisual', 20),
  ('AV3. #Identitat',                                  'Disseny Audiovisual', 30),
  ('AV4. #Transformació #Social #Salut',               'Disseny Audiovisual', 40),

  ('E1. #Disseny crític',                              'Disseny Espais',      110),
  ('E2. #Experimentació processual',                   'Disseny Espais',      120),
  ('E3. #Experimentació tècnica',                      'Disseny Espais',      130),
  ('E4. #Transformació social #Salut',                 'Disseny Espais',      140),

  ('M1. #Disseny crític',                              'Disseny Moda',        210),
  ('M2. #Experimentació tècnica',                      'Disseny Moda',        220),
  ('M3. #Experimentació processual',                   'Disseny Moda',        230),
  ('M4. #Experimentació material',                     'Disseny Moda',        240),
  ('M5. #Gènere #Identitat',                           'Disseny Moda',        250),

  ('G1. #Disseny crític I',                            'Disseny Gràfic',      310),
  ('G2. #Disseny crític II',                           'Disseny Gràfic',      320),
  ('G3. #Disseny especulatiu',                         'Disseny Gràfic',      330),
  ('G4. #Experimentació processual I',                 'Disseny Gràfic',      340),
  ('G5. #Experimentació processual II',                'Disseny Gràfic',      350),
  ('G6. #Experimentació material #tècnica',            'Disseny Gràfic',      360),
  ('G7. #Memòria #Arxiu I #Identitat (Branding)',      'Disseny Gràfic',      370),
  ('G8. #Identitat / #Gènere',                         'Disseny Gràfic',      380),
  ('G9. #Memòria #Arxiu II',                           'Disseny Gràfic',      390),
  ('G10. #Transformació social #Salut I',              'Disseny Gràfic',      400),
  ('G11. #Transformació social #Salut II',             'Disseny Gràfic',      410)
ON CONFLICT (name) DO NOTHING;
