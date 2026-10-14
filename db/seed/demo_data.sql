-- Mini-JAMMS demo data
-- Paste the whole file into the Supabase SQL editor with nothing selected, and run once.
--
-- 18 reports spread over 18 September to 13 October 2026, so the date filter
-- has a real range to work across. Statuses follow a plausible lifecycle, and
-- updated_at is set later than created_at where work has happened, so response
-- time is visible.
--
-- Note on created_at: the API will not accept it. ReportCreate deliberately
-- excludes id, status, created_at and photo_path so a caller cannot set them.
-- Back-dating demo data therefore has to be done in SQL. The CHECK constraints
-- and the foreign key to report_statuses still apply, so this data is validated
-- by the database even though it did not come through the API.

BEGIN;

INSERT INTO public.reports
    (location, problem_type, description, reporter_name, reporter_contact,
     user_type, status, created_at, updated_at)
VALUES
-- Week of 18 September -- older work, mostly finished
('I-95 NB at MM 36.4, right lane',
 'pothole',
 'Deep pothole in the right lane just past the on-ramp. Heard several vehicles strike it.',
 'Marcus Webb', 'mwebb@fastmail.com',
 'public', 'closed', '2026-09-18 07:42:00-04', '2026-09-29 15:10:00-04'),

('SR-84 EB shoulder near Davie Rd',
 'damaged_fence',
 'Section of boundary fence flattened, roughly 20 feet. Looks like it was hit.',
 'Denise Alvarado', '954-555-0147',
 'staff', 'closed', '2026-09-19 11:15:00-04', '2026-10-02 09:30:00-04'),

('US-1 at Broward Blvd overpass',
 'lighting',
 'Four consecutive light poles out on the southbound side. Very dark under the overpass.',
 'Ray Kowalski', 'rkowalski1962@gmail.com',
 'public', 'completed', '2026-09-21 20:33:00-04', '2026-10-08 16:45:00-04'),

('I-595 WB at MM 8.2',
 'damaged_attenuator',
 'Crash cushion at the gore point is crushed and the barrels are scattered.',
 'Trooper J. Linares', 'jlinares@fhp.state.fl.us',
 'stakeholder', 'closed', '2026-09-22 05:58:00-04', '2026-10-01 13:20:00-04'),

('Turnpike SB rest area, MM 49',
 'roadside_littering',
 'Illegal dumping behind the rest area building. Household furniture and bags.',
 'Sandra Pham', 'spham@outlook.com',
 'public', 'completed', '2026-09-24 14:07:00-04', '2026-10-06 11:00:00-04'),

-- Week of 28 September -- in flight
('SR-7 NB at Sunrise Blvd',
 'signage',
 'Exit sign has rotated and is facing away from traffic. Cannot read it until past it.',
 'Hector Dominguez', '754-555-0192',
 'public', 'rework', '2026-09-28 08:20:00-04', '2026-10-11 10:15:00-04'),

('A1A at Las Olas Blvd, east side',
 'pothole',
 'Sunken section around a drain cover. Gets worse after rain.',
 'Priya Raman', 'praman@protonmail.com',
 'public', 'in_progress', '2026-09-29 16:44:00-04', '2026-10-09 07:55:00-04'),

('I-75 NB at MM 23, median',
 'damaged_fence',
 'Median cable barrier has a broken post. Cables are slack over about 40 feet.',
 'Dale Ferreira', 'dferreira@royjorgensen.com',
 'staff', 'rework_completed', '2026-09-30 06:12:00-04', '2026-10-12 14:30:00-04'),

('Griffin Rd EB between SR-7 and Dykes Rd',
 'lighting',
 'Streetlight flickering continuously through the night. Pole number 4471.',
 'Angela Moss', 'amoss.home@gmail.com',
 'public', 'in_progress', '2026-10-01 22:05:00-04', '2026-10-10 09:40:00-04'),

('I-95 SB at MM 31.8',
 'roadside_accident',
 'Debris field in the right shoulder from an overnight collision. Not cleared.',
 'Trooper K. Osei', 'kosei@fhp.state.fl.us',
 'stakeholder', 'completed', '2026-10-02 04:30:00-04', '2026-10-11 17:25:00-04'),

-- Week of 5 October -- scheduled and released
('Commercial Blvd WB at NW 31st Ave',
 'pothole',
 'Two potholes in the turn lane, both wide enough to catch a motorcycle wheel.',
 'Jamal Whitfield', '954-555-0163',
 'public', 'released', '2026-10-05 09:18:00-04', '2026-10-12 08:05:00-04'),

('SR-84 WB at the weigh station entrance',
 'signage',
 'Weigh station open/closed sign is blank. Trucks are pulling in when it is closed.',
 'Lorraine Beck', 'lbeck@royjorgensen.com',
 'staff', 'scheduled', '2026-10-06 13:50:00-04', '2026-10-12 15:45:00-04'),

('Oakland Park Blvd at I-95 NB ramp',
 'lighting',
 'Ramp lighting out entirely. Reported this twice before.',
 'Nguyen Thi Hoa', 'hoa.nguyen@yahoo.com',
 'public', 'scheduled', '2026-10-07 19:22:00-04', '2026-10-13 10:10:00-04'),

('Turnpike NB at MM 54, outside shoulder',
 'damaged_attenuator',
 'Guardrail end treatment has been struck. Rail is bent outward into the shoulder.',
 'Dale Ferreira', 'dferreira@royjorgensen.com',
 'staff', 'released', '2026-10-08 07:05:00-04', '2026-10-13 09:00:00-04'),

-- This week -- new and untouched
('Sheridan St EB near the Turnpike overpass',
 'roadside_littering',
 'Tyre carcasses and shredded retread along about 300 feet of shoulder.',
 'Colin Haverty', 'chaverty@mac.com',
 'public', 'pending', '2026-10-10 11:33:00-04', '2026-10-10 11:33:00-04'),

('I-595 EB at MM 3.5',
 'pothole',
 'Pothole forming at a joint in the concrete. Still small but spreading.',
 'Yvette Brassard', '786-555-0124',
 'public', 'open', '2026-10-11 15:47:00-04', '2026-10-11 15:47:00-04'),

('Davie Blvd at SW 27th Ave',
 'other',
 'Storm drain grate is missing. Open hole at the kerb line, about a foot across.',
 'Reverend P. Olatunji', 'polatunji@stmarksfl.org',
 'stakeholder', 'open', '2026-10-12 08:14:00-04', '2026-10-12 08:14:00-04'),

('SR-7 SB at Broward Blvd, median',
 'signage',
 'Street name blade has come loose and is hanging down into the turn lane.',
 'Bianca Restrepo', 'brestrepo@gmail.com',
 'public', 'pending', '2026-10-13 09:26:00-04', '2026-10-13 09:26:00-04');

COMMIT;


-- Check it landed as expected:
--
-- SELECT status, count(*)
-- FROM public.reports
-- GROUP BY status
-- ORDER BY count(*) DESC;
--
-- SELECT min(created_at), max(created_at), count(*) FROM public.reports;
