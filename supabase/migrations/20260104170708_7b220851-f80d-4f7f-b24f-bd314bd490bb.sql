-- Add new columns to medications table for storing complete order information
ALTER TABLE medications
ADD COLUMN price_per_box DECIMAL(10,2),
ADD COLUMN tablets_per_box INTEGER,
ADD COLUMN payment_method TEXT,
ADD COLUMN delivery_method TEXT,
ADD COLUMN collection_clinic TEXT,
ADD COLUMN order_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN subsidy_percent INTEGER,
ADD COLUMN total_paid DECIMAL(10,2);