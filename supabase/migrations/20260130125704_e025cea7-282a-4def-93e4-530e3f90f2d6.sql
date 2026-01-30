-- Set last_edited_by to NULL instead of deleting records
UPDATE drive_document_content SET last_edited_by = NULL WHERE last_edited_by = '812e24e7-fe8b-487d-b23d-310024066aeb';
