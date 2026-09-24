-- Free up usernames of soft-deleted users so they can be reused
UPDATE users
SET username = username || '_deleted_' || id
WHERE is_active = 0 AND username NOT LIKE '%_deleted_%';

-- Free up barcodes of soft-deleted products so they can be reused
UPDATE products
SET barcode = barcode || '_deleted_' || id
WHERE is_active = 0 AND barcode NOT LIKE '%_deleted_%';
