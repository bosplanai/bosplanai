-- Delete placeholder document content records so they get re-created with proper parsed content on next open
DELETE FROM public.data_room_document_content 
WHERE content IN ('<p>Start editing this document...</p>', '<p></p>', '')
   OR content IS NULL
   OR LENGTH(content) < 20;