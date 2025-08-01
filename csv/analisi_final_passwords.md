# Anàlisi de Relació Assignatures-Passwords

## Resum Executiu

S'ha completat l'anàlisi per relacionar les assignatures de la base de dades amb els passwords de l'Excel `usuaris-guies-docents.xlsx`. 

### Resultats Principals:
- **Total usuaris Excel**: 143 (120 assignatures + 23 genèrics)
- **Assignatures base de dades**: 170
- **Coincidències trobades**: 101 assignatures (84.9% d'èxit)
- **No relacionades**: 18 usuaris

## Estadístiques de Confiança

- **Confiança Alta (>80%)**: 0 coincidències
- **Confiança Mitjana (60-80%)**: 95 coincidències (94.1%)
- **Confiança Baixa (<60%)**: 6 coincidències (5.9%)

## Exemples de Coincidències

### Confiança Mitjana-Alta (70-77%)
1. **Laboratori de Processos i Projectes V** (BA302)
   - Username: `laboratori_de_processos_i_projectes_v`
   - Password: `6t%%TlSNLBrU03lvjdwiyAXv`
   - Score: 77%

2. **2D. Llenguatges, Tècniques i Tecnologies** (BA101)
   - Username: `2d_llenguatges_tecniques_i_tecnologies`
   - Password: `I38JOvi4D4Fi`
   - Score: 70%

3. **Tipografia I** (GDVG23)
   - Username: `tipografia_i`
   - Password: `$VeIX!Dmk)Xth!ERx#kd2lBn`
   - Score: 70%

## Patrons Identificats

### 1. Nomenclatura d'Usernames
- Format general: nom_assignatura_amb_underscores
- Números romans convertits a minúscules: `_i`, `_ii`, `_iii`, `_iv`
- Caràcters especials eliminats
- Accents eliminats

### 2. Tipus de Passwords
- Longitud: 12-24 caràcters
- Complexitat alta: majúscules, minúscules, números, símbols
- Generats automàticament

## Usuaris No Relacionats (18)

Els següents usernames no s'han pogut relacionar amb cap assignatura:

1. `antropologia_sociocultural`
2. `art_activisme_mediacio_i_pedagogia`
3. `art_institucio_i_mercat`
4. `art_practices_in_context_seminar`
5. `debats_contamporanis_arts_ciencies_tecnologia`
6. `debats_contemporanis_en_les_arts_i_les_ciencies_socials`
7. `disseny_i_comunicacio`
8. `disseny_i_publicitat`
9. `disseny-i-interaccio`
10. `disseny-i-pensament-critic`
11. `economia_empresa_i_disseny`
12. `iconografia_i_comunicacio`
13. `imatge_i_comunicacio`
14. `metodologies_transdisciplinaries_i_experimentals`
15. `pensament_contemporani_i_practiques_artistiques`
16. `programacio_per_dissenyadors`
17. `visualisation_and_documentation_workshop`
18. `writing_and_communication_workshop`

## Recomanacions

### 1. Millora del Matching
- Revisar manualment les 18 assignatures no relacionades
- Possiblement són assignatures noves o amb noms diferents a la BD
- Considerar actualitzar la base de dades amb aquests noms

### 2. Ús dels Passwords
- Els passwords identificats es poden utilitzar per configurar l'accés a les guies docents
- Cada assignatura tindrà el seu propi accés amb el password corresponent
- Es recomana implementar un sistema de gestió d'aquests accessos

### 3. Seguretat
- Els passwords són complexos i segurs
- Es recomana no compartir aquest fitxer públicament
- Implementar un sistema de rotació de passwords periòdic

## Fitxers Generats

1. **subject_password_mapping.json**: Mapeig complet amb detalls tècnics
2. **matching_report.txt**: Informe detallat de totes les coincidències
3. **analisi_final_passwords.md**: Aquest document de resum

## Conclusió

S'ha aconseguit relacionar exitosament el 84.9% de les assignatures amb els seus passwords corresponents. Les assignatures no relacionades probablement corresponen a cursos nous o amb nomenclatura diferent que requereixen revisió manual.