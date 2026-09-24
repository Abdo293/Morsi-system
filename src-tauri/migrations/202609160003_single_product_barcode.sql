-- Variants remain separate stock records, but one parent barcode identifies the product.
-- Existing variant labels are retired; their stock, invoice links, and IDs remain intact.
UPDATE product_variants SET barcode = NULL WHERE barcode IS NOT NULL;
