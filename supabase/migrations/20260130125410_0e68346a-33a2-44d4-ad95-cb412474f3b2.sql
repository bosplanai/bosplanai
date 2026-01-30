-- First delete files in folders created by this user
DELETE FROM drive_files WHERE folder_id IN (SELECT id FROM drive_folders WHERE created_by = '812e24e7-fe8b-487d-b23d-310024066aeb');

-- Delete folders created by this user
DELETE FROM drive_folders WHERE created_by = '812e24e7-fe8b-487d-b23d-310024066aeb';

-- Delete drive files uploaded by this user
DELETE FROM drive_files WHERE uploaded_by = '812e24e7-fe8b-487d-b23d-310024066aeb';

-- Delete tasks for this user
DELETE FROM tasks WHERE user_id = '812e24e7-fe8b-487d-b23d-310024066aeb';

-- Delete personal checklist items
DELETE FROM personal_checklist_items WHERE user_id = '812e24e7-fe8b-487d-b23d-310024066aeb';

-- Delete profile
DELETE FROM profiles WHERE id = '812e24e7-fe8b-487d-b23d-310024066aeb';
